export default {
  async fetch(request, env, ctx) {
    return new Response("FlexiCanchas Worker OK", { status: 200 });
  }
};