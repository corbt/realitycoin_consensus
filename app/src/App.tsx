import * as anchor from "@project-serum/anchor";
import "./App.css";
import { addValidator, airdrop, program } from "./programClient";

const initialize = async () => {
  console.log("initializing");
  await airdrop(program.provider.wallet.publicKey);
  console.log("adding");

  // @ts-ignore
  await addValidator(program.provider.wallet.payer, new anchor.BN(5000));
  console.log("Validator added");
};

initialize();

export default function App() {
  return (
    <div className="App">
      <div>
        <h1>Hello World</h1>
      </div>
    </div>
  );
}
