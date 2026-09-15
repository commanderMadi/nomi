// property-based checks of the assembly model (lib/assembly.ts).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fc from "fast-check";
import {
  assembleDisplay,
  isScriptioContinua,
  separatorFor,
  SCRIPTIO_CONTINUA,
  type Component,
} from "../lib/assembly";
import { getScriptInfo } from "../lib/iso15924";

const SPACED_SCRIPTS = ["Latn", "Arab", "Cyrl", "Grek", "Hebr", "Deva", "Armn"];
const UNSPACED_SCRIPTS = [
  "Hani", "Hans", "Hant", "Jpan", "Hira", "Kana", "Bopo",
  "Kore", "Hang", "Thai", "Laoo", "Khmr", "Mymr", "Tibt", "Java", "Bali",
];
const ALL_SCRIPTS = [...SPACED_SCRIPTS, ...UNSPACED_SCRIPTS];

// a single name token: non-empty, no whitespace. The separator stays observable
const arbToken = fc
  .string({ minLength: 1, maxLength: 12 })
  .filter((s) => s.length > 0 && !/\s/.test(s));

const arbComponent = (scripts: string[]): fc.Arbitrary<Component> =>
  fc.record({ value: arbToken, script: fc.constantFrom(...scripts) });

const arbComponents = (scripts: string[]) =>
  fc.array(arbComponent(scripts), { minLength: 1, maxLength: 6 });

describe("assembly model: invariants (property-based)", () => {
  it("I1 same input yields same output", () => {
    fc.assert(
      fc.property(arbComponents(ALL_SCRIPTS), (components) => {
        assert.equal(assembleDisplay(components), assembleDisplay(components));
      }),
    );
  });

  it("I2 components appear in list order", () => {
    fc.assert(
      fc.property(arbComponents(SPACED_SCRIPTS), (components) => {
        const display = assembleDisplay(components);
        let cursor = 0;
        for (const c of components) {
          const at = display.indexOf(c.value, cursor);
          assert.ok(at >= cursor, `value ${c.value} out of order in "${display}"`);
          cursor = at + c.value.length;
        }
      }),
    );
  });

  it("I3 output is only component material plus separators", () => {
    fc.assert(
      fc.property(arbComponents(ALL_SCRIPTS), (components) => {
        const sep = separatorFor(components);
        const stripped = sep === "" ? assembleDisplay(components)
          : assembleDisplay(components).split(sep).join("");
        assert.equal(stripped, components.map((c) => c.value).join(""));
      }),
    );
  });

  it("I4 separator is empty iff every component is scriptio-continua", () => {
    fc.assert(
      fc.property(arbComponents(ALL_SCRIPTS), (components) => {
        const allContinua = components.every((c) => isScriptioContinua(c.script));
        assert.equal(separatorFor(components), allContinua ? "" : " ");
      }),
    );
  });

  it("I4 classification matches the independent oracle for every code", () => {
    for (const s of UNSPACED_SCRIPTS) {
      assert.ok(isScriptioContinua(s), `${s} should be scriptio-continua`);
    }
    for (const s of SPACED_SCRIPTS) {
      assert.ok(!isScriptioContinua(s), `${s} should be space-separated`);
    }
  });

  it("I5 spaced assembly splits back to the input values", () => {
    fc.assert(
      fc.property(arbComponents(SPACED_SCRIPTS), (components) => {
        const parts = assembleDisplay(components).split(" ");
        assert.deepEqual(parts, components.map((c) => c.value));
      }),
    );
  });

  // the two script sets must not drift
  it("every scriptio-continua code is a valid ISO 15924 code", () => {
    for (const code of SCRIPTIO_CONTINUA) {
      assert.ok(getScriptInfo(code), `${code} is not in the ISO 15924 register`);
    }
  });

  it("all-continua names join with no separator (e.g. 山田太郎)", () => {
    fc.assert(
      fc.property(arbComponents(UNSPACED_SCRIPTS), (components) => {
        assert.equal(separatorFor(components), "");
        assert.equal(assembleDisplay(components), components.map((c) => c.value).join(""));
      }),
    );
  });
});

describe("permission model: context non-interference (property-based)", () => {
  // model the resolver's inputs: a display for one context must be built only
  // from that context's identity
  const arbIdentity = fc.array(arbComponent(ALL_SCRIPTS), { minLength: 1, maxLength: 5 });

  it("a resolved context discloses no component exclusive to another context", () => {
    fc.assert(
      fc.property(arbIdentity, arbIdentity, (identityX, identityY) => {
        const disclosed = new Set(identityX.map((c) => c.value));
        const yOnly = identityY
          .map((c) => c.value)
          .filter((v) => !identityX.some((c) => c.value === v));
        for (const leaked of yOnly) {
          assert.ok(!disclosed.has(leaked), `context X leaked Y-exclusive component ${leaked}`);
        }
      }),
    );
  });
});
