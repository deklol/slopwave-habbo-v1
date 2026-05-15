import type { HabboVersionAdapter } from "../HabboVersionAdapter";
import { encodeHabboBase64 } from "./Base64Encoding";
import { Base64Vl64PacketWriter } from "./Base64Vl64PacketCodec";
import { concatBytes, toLatin1Bytes } from "./latin1";
import { encodeV1TextClientPacket } from "./V1TextPacketCodec";

export interface HabboRegistrationFields {
  readonly sourceBody?: unknown;
  readonly parentagree?: unknown;
  readonly name?: unknown;
  readonly password?: unknown;
  readonly figure?: unknown;
  readonly sex?: unknown;
  readonly customData?: unknown;
  readonly email?: unknown;
  readonly birthday?: unknown;
  readonly directMail?: unknown;
  readonly has_read_agreement?: unknown;
  readonly isp_id?: unknown;
  readonly partnersite?: unknown;
  readonly oldpassword?: unknown;
}

type RegistrationFieldKind = "boolean" | "string";

interface RegistrationFieldSpec {
  readonly id: number;
  readonly name: keyof HabboRegistrationFields;
  readonly kind: RegistrationFieldKind;
}

const registrationFieldSpecs: readonly RegistrationFieldSpec[] = [
  { id: 1, name: "parentagree", kind: "boolean" },
  { id: 2, name: "name", kind: "string" },
  { id: 3, name: "password", kind: "string" },
  { id: 4, name: "figure", kind: "string" },
  { id: 5, name: "sex", kind: "string" },
  { id: 6, name: "customData", kind: "string" },
  { id: 7, name: "email", kind: "string" },
  { id: 8, name: "birthday", kind: "string" },
  { id: 9, name: "directMail", kind: "boolean" },
  { id: 10, name: "has_read_agreement", kind: "boolean" },
  { id: 11, name: "isp_id", kind: "string" },
  { id: 12, name: "partnersite", kind: "string" },
  { id: 13, name: "oldpassword", kind: "string" }
];

export function encodeHabboRegistrationRequest(adapter: HabboVersionAdapter, fields: HabboRegistrationFields): Uint8Array {
  switch (adapter.protocol.kind) {
    case "v1-text-length":
      return encodeV1TextRegistrationRequest(fields);
    case "base64-vl64":
    case "base64-vl64-mus":
      return encodeBase64Vl64RegistrationRequest(adapter, fields);
    default:
      throw new Error(`No registration packet encoder for protocol ${adapter.protocol.kind}`);
  }
}

export function encodeHabboApproveNameRequest(adapter: HabboVersionAdapter, username: string): Uint8Array {
  switch (adapter.protocol.kind) {
    case "base64-vl64":
    case "base64-vl64-mus":
      return encodeBase64Vl64ApproveNameRequest(adapter, username);
    default:
      throw new Error(`No name approval packet encoder for protocol ${adapter.protocol.kind}`);
  }
}

export function encodeHabboFindUserRequest(adapter: HabboVersionAdapter, username: string, context = "REGNAME"): Uint8Array {
  switch (adapter.protocol.kind) {
    case "base64-vl64":
    case "base64-vl64-mus":
      return encodeBase64Vl64FindUserRequest(adapter, username, context);
    default:
      throw new Error(`No find-user packet encoder for protocol ${adapter.protocol.kind}`);
  }
}

function encodeBase64Vl64RegistrationRequest(adapter: HabboVersionAdapter, fields: HabboRegistrationFields): Uint8Array {
  const registerHeader = adapter.protocol.commandIds?.["REGISTER"];
  if (registerHeader === undefined) {
    throw new Error(`${adapter.id} does not define a REGISTER command id`);
  }

  const chunks: Uint8Array[] = [];
  for (const spec of registrationFieldSpecs) {
    if (!(spec.name in fields)) {
      continue;
    }

    chunks.push(encodeHabboBase64(spec.id, 2));
    const value = fields[spec.name];
    if (spec.kind === "boolean") {
      chunks.push(encodeBooleanByte(coerceBoolean(value)));
    } else {
      const bytes = toLatin1Bytes(value === undefined || value === null ? "" : String(value));
      chunks.push(encodeHabboBase64(bytes.length, 2), bytes);
    }
  }

  return new Base64Vl64PacketWriter(registerHeader)
    .writeRaw(concatBytes(chunks))
    .toClientRequest();
}

function encodeV1TextRegistrationRequest(fields: HabboRegistrationFields): Uint8Array {
  const sourceBody = fields.sourceBody;
  if (typeof sourceBody === "string") {
    return encodeV1TextClientPacket("REGISTER", [sourceBody]);
  }

  return encodeV1TextClientPacket("REGISTER", [fieldsToV1TextRegistrationBody(fields)]);
}

function fieldsToV1TextRegistrationBody(fields: HabboRegistrationFields): string {
  return [
    `name=${stringField(fields.name)}`,
    `password=${stringField(fields.password)}`,
    `email=${stringField(fields.email)}`,
    `figure=${stringField(fields.figure).replace(/[\r\n]+/g, "")}`,
    `directMail=${booleanTextField(fields.directMail)}`,
    `birthday=${stringField(fields.birthday)}`,
    "phonenumber=+44",
    `customData=${stringField(fields.customData)}`,
    `has_read_agreement=${booleanTextField(fields.has_read_agreement)}`,
    `sex=${stringField(fields.sex)}`,
    "country="
  ].join("\r");
}

function encodeBase64Vl64ApproveNameRequest(adapter: HabboVersionAdapter, username: string): Uint8Array {
  const approveNameHeader = adapter.protocol.commandIds?.["APPROVENAME"];
  if (approveNameHeader === undefined) {
    throw new Error(`${adapter.id} does not define an APPROVENAME command id`);
  }

  // Registration Component Class sends [#string: name, #short: 0].
  return new Base64Vl64PacketWriter(approveNameHeader)
    .writeString(username.trim())
    .writeRaw(encodeHabboBase64(0, 2))
    .toClientRequest();
}

function encodeBase64Vl64FindUserRequest(adapter: HabboVersionAdapter, username: string, context: string): Uint8Array {
  const findUserHeader = adapter.protocol.commandIds?.["FINDUSER"];
  if (findUserHeader === undefined) {
    throw new Error(`${adapter.id} does not define a FINDUSER command id`);
  }

  return new Base64Vl64PacketWriter(findUserHeader)
    .writeRaw(`${username.trim()}\t${context}`)
    .toClientRequest();
}

function encodeBooleanByte(value: boolean): Uint8Array {
  return Uint8Array.of(64 + (value ? 1 : 0));
}

function coerceBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return value !== "" && value !== "0" && value.toLowerCase() !== "false";
  }

  return Boolean(value);
}

function stringField(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function booleanTextField(value: unknown): string {
  return coerceBoolean(value) ? "1" : "0";
}
