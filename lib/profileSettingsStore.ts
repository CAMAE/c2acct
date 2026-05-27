import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type CompanyProfileSettings = {
  companyName: string;
  contactName: string;
  workEmail: string;
  phone: string;
  businessAddress: string;
  paymentDetails: string;
  companyDescription: string;
  website: string;
};

export type UserProfileSettings = {
  contactName: string;
  workEmail: string;
  phone: string;
  businessAddress: string;
  companyDescription: string;
};

type ProfileSettingsStore = {
  companyProfiles: Record<string, CompanyProfileSettings>;
  userProfiles: Record<string, UserProfileSettings>;
};

const STORE_PATH = path.join(process.cwd(), "data", "pat-profile-settings.json");

const EMPTY_STORE: ProfileSettingsStore = {
  companyProfiles: {},
  userProfiles: {},
};

function normalizeString(value: string | null | undefined) {
  return (value ?? "").trim();
}

async function readStore(): Promise<ProfileSettingsStore> {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<ProfileSettingsStore>;

    return {
      companyProfiles: parsed.companyProfiles ?? {},
      userProfiles: parsed.userProfiles ?? {},
    };
  } catch {
    return EMPTY_STORE;
  }
}

async function writeStore(store: ProfileSettingsStore) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function getCompanyProfileSettings(scopeKey: string, defaults: CompanyProfileSettings) {
  const store = await readStore();
  return {
    ...defaults,
    ...(store.companyProfiles[scopeKey] ?? {}),
  };
}

export async function saveCompanyProfileSettings(scopeKey: string, settings: CompanyProfileSettings) {
  const store = await readStore();
  store.companyProfiles[scopeKey] = {
    companyName: normalizeString(settings.companyName),
    contactName: normalizeString(settings.contactName),
    workEmail: normalizeString(settings.workEmail),
    phone: normalizeString(settings.phone),
    businessAddress: normalizeString(settings.businessAddress),
    paymentDetails: normalizeString(settings.paymentDetails),
    companyDescription: normalizeString(settings.companyDescription),
    website: normalizeString(settings.website),
  };
  await writeStore(store);
}

export async function getUserProfileSettings(scopeKey: string, defaults: UserProfileSettings) {
  const store = await readStore();
  return {
    ...defaults,
    ...(store.userProfiles[scopeKey] ?? {}),
  };
}

export async function saveUserProfileSettings(scopeKey: string, settings: UserProfileSettings) {
  const store = await readStore();
  store.userProfiles[scopeKey] = {
    contactName: normalizeString(settings.contactName),
    workEmail: normalizeString(settings.workEmail),
    phone: normalizeString(settings.phone),
    businessAddress: normalizeString(settings.businessAddress),
    companyDescription: normalizeString(settings.companyDescription),
  };
  await writeStore(store);
}
