// CycloneDX 1.5 Software Bill of Materials (SBOM) Generator
// Parses package.json & package-lock.json to document direct & transitive dependencies, versions, hashes, and licenses.
import fs from "fs";
import path from "path";
import crypto from "crypto";

function generateCycloneDxSbom() {
  const rootDir = process.cwd();
  const pkgPath = path.join(rootDir, "package.json");
  const lockPath = path.join(rootDir, "package-lock.json");

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const lock = fs.existsSync(lockPath) ? JSON.parse(fs.readFileSync(lockPath, "utf8")) : { packages: {} };

  const directDeps = new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ]);

  const components: any[] = [];
  const packagesObj = lock.packages || {};

  for (const [pkgKey, meta] of Object.entries<any>(packagesObj)) {
    if (!pkgKey || !pkgKey.startsWith("node_modules/")) continue;
    const name = pkgKey.replace(/^.*node_modules\//, "");
    const version = meta.version || "0.0.0";
    const isDirect = directDeps.has(name);

    const hashes: { alg: string; content: string }[] = [];
    if (typeof meta.integrity === "string" && meta.integrity.startsWith("sha512-")) {
      const b64 = meta.integrity.slice("sha512-".length);
      const hex = Buffer.from(b64, "base64").toString("hex");
      hashes.push({ alg: "SHA-512", content: hex });
    }

    components.push({
      type: "library",
      name,
      version,
      scope: meta.dev ? "optional" : "required",
      purl: `pkg:npm/${encodeURIComponent(name)}@${version}`,
      hashes: hashes.length > 0 ? hashes : undefined,
      licenses: meta.license ? [{ license: { id: String(meta.license) } }] : undefined,
      properties: [
        { name: "dependency:relationship", value: isDirect ? "direct" : "transitive" },
      ],
    });
  }

  const sbom = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:${crypto.randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [
        {
          vendor: "PremiKeys Security",
          name: "premikeys-sbom-generator",
          version: "1.0.0",
        },
      ],
      component: {
        type: "application",
        name: pkg.name || "premikeys",
        version: pkg.version || "0.1.0",
      },
    },
    components,
  };

  const outPath = path.join(rootDir, "sbom.cdx.json");
  fs.writeFileSync(outPath, JSON.stringify(sbom, null, 2), "utf8");
  console.log(`✓ Generated CycloneDX 1.5 SBOM at sbom.cdx.json (${components.length} components documented).`);
}

generateCycloneDxSbom();

