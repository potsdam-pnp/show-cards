{ buildNpmPackage, lib, poppler_utils, ... }: 


buildNpmPackage rec {
  pname = "show-cards";
  version = "0.1.0";

  buildInputs = [ poppler_utils ];

  src = ./src;
  npmDepsHash = "sha256-veq64xSAgWXbbTemCg/jrAYVt4C30zNaYH2e/li+Yy8=";
}
