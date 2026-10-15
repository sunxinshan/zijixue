import assert from "node:assert/strict";
import test from "node:test";

import {
  AgentRequestError,
  readAgentJson,
} from "@/lib/agent/client";

test("Agent API 收到 HTML 504 时转换为友好错误", async () => {
  const response = new Response(
    "<html><h1>504 Gateway Time-out</h1></html>",
    {
      status: 504,
      headers: { "content-type": "text/html" },
    },
  );

  await assert.rejects(
    readAgentJson(response),
    (error: unknown) =>
      error instanceof AgentRequestError &&
      error.status === 504 &&
      error.message.includes("超时"),
  );
});

test("Agent API JSON 错误保留服务端消息", async () => {
  const response = Response.json({ error: "题目生成失败" }, { status: 502 });

  await assert.rejects(
    readAgentJson(response),
    (error: unknown) =>
      error instanceof AgentRequestError &&
      error.status === 502 &&
      error.message === "题目生成失败",
  );
});

test("Agent API JSON 成功响应正常解析", async () => {
  const response = Response.json({ provider: "deepseek" });
  assert.deepEqual(await readAgentJson(response), { provider: "deepseek" });
});
