{ buildNpmPackage, nodejs, poppler_utils, ... }: 


buildNpmPackage rec {
  pname = "show-cards";
  version = "0.1.0";

  postInstall = ''
    makeWrapper ${nodejs}/bin/node $out/bin/show-cards --add-flags $packageOut/index.js --prefix PATH : ${ poppler_utils }/bin
  ''; 

  src = ./src;
  npmDepsHash = "sha256-veq64xSAgWXbbTemCg/jrAYVt4C30zNaYH2e/li+Yy8=";
}
