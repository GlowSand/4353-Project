import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { bus } from "../notifications.js"; 

describe("services/notifications bus", () => {
  const topic = "notice:test";

  beforeEach(() => {
    
    bus.removeAllListeners?.(topic);
  });

  afterEach(() => {
    bus.removeAllListeners?.(topic);
  });

  it("emits to a single listener", () => {
    const handler = vi.fn();
    bus.on(topic, handler);

    const payload = { id: "n1", msg: "hello" };
    bus.emit(topic, payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(payload);

    bus.off(topic, handler);
  });

  it("supports multiple listeners and off()", () => {
    const a = vi.fn();
    const b = vi.fn();

    bus.on(topic, a);
    bus.on(topic, b);

    bus.emit(topic, { id: "n2" });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    bus.off(topic, a);
    bus.emit(topic, { id: "n3" });

    expect(a).toHaveBeenCalledTimes(1); 
    expect(b).toHaveBeenCalledTimes(2); 

    bus.off(topic, b);
  });
});
