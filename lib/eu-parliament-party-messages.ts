import type { EuPartyKey } from "@/lib/eu-party-time";

const EU_PARTY_MESSAGE_KEYS: Record<EuPartyKey, string> = {
  s_and_d: "euPartySAndD",
  epp: "euPartyEpp",
  renew: "euPartyRenew",
  left: "euPartyLeft",
  green: "euPartyGreen",
  c_and_r: "euPartyCAndR",
  patriots: "euPartyPatriots",
  independents: "euPartyIndependents",
};

/** `sessionControlClient` message key for political-group labels in the guided profile. */
export function euParliamentPartyMessageKey(key: EuPartyKey): string {
  return EU_PARTY_MESSAGE_KEYS[key];
}
