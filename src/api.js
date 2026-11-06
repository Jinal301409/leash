async function call(path, options) {
  const res = await fetch(path, options);
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export const getRules = () => call("/api/rules");
export const updateRules = (rules) =>
  call("/api/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rules),
  });
export const resetRules = () => call("/api/rules/reset", { method: "POST" });
export const getLedger = () => call("/api/ledger");
export const sendRequest = (text) =>
  call("/api/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
export const act = (kind, id) => call(`/api/${kind}/${id}`, { method: "POST" });
export const resetDemo = () => call("/api/reset", { method: "POST" });