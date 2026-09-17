-- Secret Treasure — Cosmopolitan / redbean bootstrap
-- https://github.com/jart/cosmopolitan  https://redbean.dev/

ProgramBrand("Secret Treasure")
ProgramAddr("127.0.0.1")
ProgramPort(19996)
ProgramContentType("unityweb", "application/octet-stream")
ProgramContentType("js", "text/javascript; charset=utf-8")
ProgramCache(86400, "public")
ProgramMaxPayloadSize(64 * 1024 * 1024)

-- If port 19996 is already serving (prior APE / run-web.sh), do not fail the
-- bind — just reopen the browser at the existing instance and exit.
local function already_serving()
  local sock = unix.socket()
  if not sock then
    return false
  end
  local ok = unix.connect(sock, ParseIp("127.0.0.1"), 19996)
  unix.close(sock)
  return ok and true or false
end

if already_serving() then
  LaunchBrowser("/")
  unix.exit(0)
end

LaunchBrowser("/")

-- redbean 403s UnityLoader.js because it contains eval(). Serve it ourselves.
function OnHttpRequest()
  local path = GetPath()
  if path == "/Build/UnityLoader.js" then
    local data = LoadAsset("/Build/UnityLoader.js")
    if data then
      SetStatus(200)
      SetHeader("Content-Type", "text/javascript; charset=utf-8")
      SetHeader("Cache-Control", "public, max-age=86400")
      Write(data)
      return
    end
  end
  Route()
end
