{ buildNpmPackage, lib, ... }: 


buildNpmPackage rec {
  pname = "show-cards";
  version = "0.1.0";

  src = ./src;
  npmDepsHash = "sha256-veq64xSAgWXbbTemCg/jrAYVt4C30zNaYH2e/li+Yy8=";
}
