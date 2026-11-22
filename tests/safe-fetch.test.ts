import { describe, expect, it } from "vitest";
import { checkUrl, isPublicAddress, safeFetchText } from "../scripts/lib/safe-fetch";

describe("isPublicAddress", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.0.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255"])(
    "IPv4 내부·예약 주소 %s 차단",
    (ip) => expect(isPublicAddress(ip)).toBe(false),
  );
  it.each(["::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "64:ff9b::a00:1", "2002:a00:1::1", "2001:db8::1"])(
    "IPv6 내부·예약·우회 주소 %s 차단",
    (ip) => expect(isPublicAddress(ip)).toBe(false),
  );
  it.each(["8.8.8.8", "1.1.1.1", "140.82.112.3", "2606:4700:4700::1111", "2a00:1450:4001::200e"])("공인 주소 %s 허용", (ip) => expect(isPublicAddress(ip)).toBe(true));
  it("IP가 아닌 문자열은 false", () => expect(isPublicAddress("example.com")).toBe(false));
});

describe("checkUrl", () => {
  it.each([
    ["ftp://example.com/x", "BAD_PROTOCOL"],
    ["file:///etc/passwd", "BAD_PROTOCOL"],
    ["javascript:alert(1)", "BAD_PROTOCOL"],
    ["http://localhost/", "BLOCKED_HOST"],
    ["http://app.localhost/", "BLOCKED_HOST"],
    ["http://metadata.google.internal/", "BLOCKED_HOST"],
    ["http://127.0.0.1/", "BLOCKED_IP"],
    ["http://2130706433/", "BLOCKED_IP"], // 10진수 표기 127.0.0.1
    ["http://0x7f.0.0.1/", "BLOCKED_IP"], // 16진수 표기
    ["http://[::1]/", "BLOCKED_IP"],
    ["http://[::ffff:127.0.0.1]/", "BLOCKED_IP"],
    ["http://169.254.169.254/latest/meta-data/", "BLOCKED_IP"],
    ["http://user:pw@example.com/", "CREDENTIALS_IN_URL"],
    ["http://example.com:8080/", "BAD_PORT"],
    ["not a url", "BAD_URL"],
  ])("%s → %s", (url, code) => expect(() => checkUrl(url)).toThrow(code));

  it("일반 공개 URL은 통과", () => {
    expect(checkUrl("https://example.com/post?id=1").hostname).toBe("example.com");
    expect(checkUrl("http://example.com:80/").hostname).toBe("example.com");
  });
});

describe("safeFetchText", () => {
  it("차단 대상은 요청하지 않고 null", async () => {
    await expect(safeFetchText("http://127.0.0.1:3000/")).resolves.toBeNull();
    await expect(safeFetchText("http://localhost/")).resolves.toBeNull();
    await expect(safeFetchText("file:///etc/hosts")).resolves.toBeNull();
  });
});
