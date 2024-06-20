import { Imports } from "../types";

export default class ImportManager {
  imports: Imports = new Map();
  seqImports: Set<string> = new Set();

  addImport(fileName: string, ...props: string[]) {
    props.forEach((p) =>
      (this.imports.get(fileName) ||
        this.imports.set(fileName, new Set()).get(fileName))!.add(p),
    );
    return this;
  }
}
