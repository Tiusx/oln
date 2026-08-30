// ESM wrapper for recaptcha-v3 (CJS package) so @waline/client's
// `import { load } from "recaptcha-v3"` resolves in dev.
//
// recaptcha-v3 defines its exports via Object.defineProperty(exports, "load",
// {...}), which Vite's es-module-lexer can't statically detect (and its
// __esModule flag makes Vite's static `import mod from` interop resolve to
// `mod.default`, which is undefined). A dynamic import returns the whole CJS
// exports object as `default`, so we read the functions off that.
const rec = await import('recaptcha-v3/dist/ReCaptcha.js');
const mod = rec.default && rec.default.__esModule && rec.default.default
  ? rec.default.default
  : rec.default || rec;

export const load = mod.load;
export const getInstance = mod.getInstance;
export const ReCaptchaInstance = mod.ReCaptchaInstance;
export default mod;
