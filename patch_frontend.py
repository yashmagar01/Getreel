import os

path = "frontend/components/LinkInputCard.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_error_handling = """      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || "Download failed");
      }"""

new_error_handling = """      if (!resp.ok) {
        let msg = "Download failed";
        const txt = await resp.text();
        try {
          const parsed = JSON.parse(txt);
          if (parsed.detail && Array.isArray(parsed.detail)) {
            msg = parsed.detail[0].msg;
          } else if (parsed.detail) {
             msg = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
          } else {
             msg = txt;
          }
        } catch {
          msg = txt || msg;
        }
        throw new Error(msg);
      }"""

if old_error_handling in content:
    content = content.replace(old_error_handling, new_error_handling)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched frontend error handling.")
else:
    print("Pattern not found in LinkInputCard.tsx")
