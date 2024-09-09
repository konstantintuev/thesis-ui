import { TFunction } from "i18next"

if (!String.prototype.toTranslationKey) {
  String.prototype.toTranslationKey = function (
    t: TFunction<"translation">
  ): string {
    return t(this.toString(), this.toString())
  }
}
