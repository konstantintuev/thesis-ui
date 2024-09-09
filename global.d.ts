import {TFunction} from "i18next";

export {};

declare global {
  interface String {
    toTranslationKey(t: TFunction<"translation">): string;
  }
}