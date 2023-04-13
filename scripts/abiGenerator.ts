import fs from 'fs';
import path from 'path';
import hre from 'hardhat';

async function main(paths: string[]) {
  const abis: any[] = await Promise.all(
    paths.map(async (p) => {
      const { abi } = await hre.artifacts.readArtifact(p);
      return abi;
    })
  );

  const merged = abis
    .reduce((arr, item) => {
      arr.push(...item);
      return arr;
    }, [])
    .map((a: any) => JSON.stringify(a));

  const set: Set<string> = new Set(merged);
  const setParsed = Array.from(set).map((a) => JSON.parse(a));

  fs.writeFileSync(
    path.resolve(__dirname, 'data', 'fullAbi.json'),
    `${JSON.stringify(setParsed, null, 4)}\n`,
    {
      flag: 'w'
    }
  );
}

main([
  'contracts/resolvers/implementations/ResolverRegistry.sol:ResolverRegistry',
  'contracts/resolvers/implementations/NameResolver.sol:NameResolver',
  'contracts/resolvers/implementations/Shared.sol:Shared',
  'contracts/resolvers/implementations/VehicleIdResolver.sol:VehicleIdResolver'
]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
