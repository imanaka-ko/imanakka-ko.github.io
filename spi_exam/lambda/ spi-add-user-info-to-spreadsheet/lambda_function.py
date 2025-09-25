# Python 3.13 ランタイム推奨
import os, json, base64, urllib.parse, urllib.request

# ── 環境変数（コンソール or IaC で設定） ─────────────────────────
# 例）ALLOWED_ORIGINS="http://127.0.0.1:3000,https://yourdomain.com"
ALLOWED_ORIGINS = {
    o.strip() for o in (os.environ.get("ALLOWED_ORIGINS") or "").split(",") if o.strip()
}
DEFAULT_ORIGIN = os.environ.get("DEFAULT_ORIGIN", "")
SERVER_SECRET  = os.environ.get("SERVER_SECRET", "")   # = GAS 側 WEBHOOK_SECRET と同値
GAS_URL        = os.environ.get("GAS_URL", "")         # = GAS の /exec URL

# ── ユーティリティ ─────────────────────────────────────────────
def _get_header(event, name):
    headers = event.get("headers") or {}
    for k, v in headers.items():
        if k.lower() == name.lower():
            return v
    return None

def _method(event):
    # HTTP API v2 / REST API v1 両対応
    m = event.get("requestContext", {}).get("http", {}).get("method")
    return m or event.get("httpMethod", "GET")

def _cors_headers(origin):
    allow_origin = origin if origin in ALLOWED_ORIGINS else DEFAULT_ORIGIN
    return {
        "Access-Control-Allow-Origin": allow_origin,
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Vary": "Origin",
    }

def _parse_body(event, content_type):
    body = event.get("body") or ""
    if event.get("isBase64Encoded"):
        try:
            body = base64.b64decode(body).decode("utf-8", "replace")
        except Exception:
            body = ""
    ct = (content_type or "").lower()
    if "application/json" in ct:
        try:
            return json.loads(body) if body else {}
        except Exception:
            return {}
    if "application/x-www-form-urlencoded" in ct:
        parsed = urllib.parse.parse_qs(body)
        return {k: (v[0] if isinstance(v, list) and v else "") for k, v in parsed.items()}
    # デフォルト：JSON→QS の順に試す
    try:
        return json.loads(body) if body else {}
    except Exception:
        parsed = urllib.parse.parse_qs(body)
        return {k: (v[0] if isinstance(v, list) and v else "") for k, v in parsed.items()}

def _json_response(status, headers, obj):
    return {
        "statusCode": status,
        "headers": {**headers, "Content-Type": "application/json"},
        "body": json.dumps(obj, ensure_ascii=False),
    }

# ── メイン ─────────────────────────────────────────────────────
def lambda_handler(event, context):
    origin = _get_header(event, "Origin") or ""
    cors = _cors_headers(origin)
    method = _method(event)

    # Preflight
    if method == "OPTIONS":
        return {"statusCode": 204, "headers": cors, "body": ""}

    if method != "POST":
        return _json_response(405, cors, {"ok": False, "error": "Method Not Allowed"})

    # 環境チェック（changeme対策を含む）
    if not GAS_URL:
        return _json_response(500, cors, {"ok": False, "error": "GAS_URL not set"})
    if not SERVER_SECRET or SERVER_SECRET.lower() == "changeme":
        return _json_response(500, cors, {"ok": False, "error": "SERVER_SECRET not set"})

    content_type = _get_header(event, "Content-Type") or ""
    payload = _parse_body(event, content_type)

    # GAS へは form-encoded で転送（ブラウザ→GAS ではなく サーバ→GAS だが、互換のため）
    form = dict(payload)
    form["secret"] = SERVER_SECRET  # クライアント提供の secret は無視・上書き
    encoded = urllib.parse.urlencode(form).encode("utf-8")

    req = urllib.request.Request(
        GAS_URL,
        data=encoded,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            upstream_status = resp.getcode()
            txt = resp.read().decode("utf-8", "replace")
    except Exception as e:
        return _json_response(502, cors, {"ok": False, "error": f"upstream_error: {e}"})

    # GAS からの応答はJSON想定。非JSONならラップして返す
    try:
        data = json.loads(txt)
    except Exception:
        data = {"ok": upstream_status < 400, "raw": txt}

    return _json_response(upstream_status, cors, data)
