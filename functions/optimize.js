export async function onRequestPost() {
  return new Response(JSON.stringify({
    error: "Backend not connected yet."
  }), {
    status: 501,
    headers: { "Content-Type": "application/json" }
  });
}
