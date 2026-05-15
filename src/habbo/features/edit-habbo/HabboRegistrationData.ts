import { HabboVariableObject } from "../../boot/HabboBootManagers";

export function createDefaultRegistrationProps(): Record<string, unknown> {
  return {
    name: "",
    figure: {},
    sex: "M",
    customData: "",
    email: "",
    birthday: "",
    has_read_agreement: "0",
    parentagree: 1,
    directMail: "0",
    password: ""
  };
}

export function createRegistrationMessageStruct(): Record<string, { readonly id: number; readonly type: "boolean" | "string" }> {
  return {
    parentagree: { id: 1, type: "boolean" },
    name: { id: 2, type: "string" },
    password: { id: 3, type: "string" },
    figure: { id: 4, type: "string" },
    sex: { id: 5, type: "string" },
    customData: { id: 6, type: "string" },
    email: { id: 7, type: "string" },
    birthday: { id: 8, type: "string" },
    directMail: { id: 9, type: "boolean" },
    has_read_agreement: { id: 10, type: "boolean" },
    isp_id: { id: 11, type: "string" },
    partnersite: { id: 12, type: "string" },
    oldpassword: { id: 13, type: "string" }
  };
}

export function readRegistrationProps(registrationInterface: HabboVariableObject | undefined): Record<string, unknown> {
  const props = registrationInterface?.get("propsToServer");
  if (typeof props === "object" && props !== null && !Array.isArray(props)) {
    return props as Record<string, unknown>;
  }

  const fallback = createDefaultRegistrationProps();
  registrationInterface?.set("propsToServer", fallback);
  return fallback;
}

export function isPasswordElementId(elementId: string): boolean {
  const normalized = elementId.toLowerCase();
  return normalized.includes("password") || normalized === "char_pw_field" || normalized === "char_pwagain_field";
}

export function isValidHabboEmail(email: string): boolean {
  if (email.length <= 6) {
    return false;
  }

  const at = email.indexOf("@");
  if (at <= 0 || email.indexOf("@", at + 1) !== -1) {
    return false;
  }

  return email.indexOf(".", at + 1) !== -1;
}
