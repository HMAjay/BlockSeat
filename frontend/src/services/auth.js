import { useSyncExternalStore } from "react";

const AUTH_CHANGE_EVENT = "blockseat-auth-change";

function readAuthSnapshot() {
  return {
    token: localStorage.getItem("blockseat_token") || "",
    bstId: localStorage.getItem("blockseat_bstId") || "",
    walletAddress: localStorage.getItem("blockseat_wallet") || "",
    adminToken: localStorage.getItem("blockseat_admin_token") || "",
  };
}

function emitAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

function subscribe(callback) {
  const handleChange = () => callback();

  window.addEventListener("storage", handleChange);
  window.addEventListener(AUTH_CHANGE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(AUTH_CHANGE_EVENT, handleChange);
  };
}

export function useAuth() {
  return useSyncExternalStore(subscribe, readAuthSnapshot, readAuthSnapshot);
}

export function signIn(authData) {
  localStorage.setItem("blockseat_token", authData.token);
  localStorage.setItem("blockseat_bstId", authData.bstId);
  localStorage.setItem("blockseat_wallet", authData.walletAddress);
  emitAuthChange();
}

export function signOut() {
  localStorage.removeItem("blockseat_token");
  localStorage.removeItem("blockseat_bstId");
  localStorage.removeItem("blockseat_wallet");
  localStorage.removeItem("blockseat_admin_token");
  emitAuthChange();
}
