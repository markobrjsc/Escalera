import { describe, expect, it, vi } from "vitest";
import {
  detachContextLease,
  forceReleaseContextLease,
  leaseContext,
  releaseClassWhenUnused,
  releaseContextLease,
  type ContextLeaseState
} from "./contextLease.js";

function fixture() {
  const state: ContextLeaseState<object> = { current: null, owners: 0 };
  const deferred: Array<() => void> = [];
  const dispose = vi.fn();
  const create = vi.fn(() => ({}));
  return { state, deferred, dispose, create, defer: (callback: () => void) => deferred.push(callback) };
}

describe("WebGL context lease", () => {
  it("reuses one context across the StrictMode setup-cleanup-setup cycle", () => {
    const value = fixture();
    const first = leaseContext(value.state, value.create)!;
    releaseContextLease(value.state, first, value.dispose, value.defer);
    const second = leaseContext(value.state, value.create)!;

    value.deferred.splice(0).forEach((callback) => callback());

    expect(second).toBe(first);
    expect(value.create).toHaveBeenCalledOnce();
    expect(value.dispose).not.toHaveBeenCalled();
    expect(value.state.owners).toBe(1);
  });

  it("releases a pending context after the final owner disappears", () => {
    const value = fixture();
    const context = leaseContext(value.state, value.create)!;
    releaseContextLease(value.state, context, value.dispose, value.defer);
    value.deferred.splice(0).forEach((callback) => callback());

    expect(value.dispose).toHaveBeenCalledOnce();
    expect(value.state).toEqual({ current: null, owners: 0 });
  });

  it("supports controller handoff and forced import-failure cleanup", () => {
    const detached = fixture();
    const detachedContext = leaseContext(detached.state, detached.create)!;
    detachContextLease(detached.state, detachedContext);
    expect(detached.state).toEqual({ current: null, owners: 0 });
    expect(detached.dispose).not.toHaveBeenCalled();

    const failed = fixture();
    const failedContext = leaseContext(failed.state, failed.create)!;
    forceReleaseContextLease(failed.state, failedContext, failed.dispose);
    expect(failed.dispose).toHaveBeenCalledWith(failedContext);
    expect(failed.state).toEqual({ current: null, owners: 0 });
  });
});

describe("visual root ownership", () => {
  it("keeps the root class while another visual owner exists", () => {
    const remove = vi.fn();
    const deferred: Array<() => void> = [];
    const root = { classList: { remove }, querySelector: vi.fn(() => ({})) };
    releaseClassWhenUnused(root, "visual3d-root", ".three-experience", (callback) => deferred.push(callback));
    deferred.splice(0).forEach((callback) => callback());
    expect(remove).not.toHaveBeenCalled();
  });

  it("removes the root class after the final owner disappears", () => {
    const remove = vi.fn();
    const deferred: Array<() => void> = [];
    const root = { classList: { remove }, querySelector: vi.fn(() => null) };
    releaseClassWhenUnused(root, "visual3d-root", ".three-experience", (callback) => deferred.push(callback));
    deferred.splice(0).forEach((callback) => callback());
    expect(remove).toHaveBeenCalledWith("visual3d-root");
  });
});
