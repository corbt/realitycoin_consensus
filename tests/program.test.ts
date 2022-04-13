import * as anchor from "@project-serum/anchor";
import { SystemProgram } from "@solana/web3.js";
import {
  addValidator,
  approvedBlock,
  castVoteOnBlock,
  collectValidatorReward,
  finalizeBlockApproval,
  finalizeBlockRejection,
  program,
  programState,
  proposeBlockForVoting,
  stakedValidator,
} from "../app/src/programClient";

anchor.setProvider(anchor.Provider.env());

describe("realitycoin_consensus", () => {
  const validators = Array(3)
    .fill("")
    .map(() => anchor.web3.Keypair.generate());

  it("Initializes correctly", async () => {
    await program.rpc.initialize(new anchor.BN(5000), {
      accounts: {
        programState: await programState.pda(),
        owner: program.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
    });

    const state = await programState.val();
    expect(state.minStake.toString()).toEqual("5000");
    expect(state.totalStaked.toString()).toEqual("0");
  });

  it("Can't be initialized twice", async () => {
    expect(
      program.rpc.initialize(new anchor.BN(5000), {
        accounts: {
          programState: await programState.pda(),
          owner: program.provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
      })
    ).rejects.toThrowError();
  });

  it("Lets users sign up as validators", async () => {
    await Promise.all(validators.map((validator) => addValidator(validator, new anchor.BN(5000))));

    expect((await programState.val()).totalStaked.toString()).toEqual("15000");
  });

  it("Proposes a block vote", async () => {
    const { blockHash, votableBlockPDA, miner } = await proposeBlockForVoting(validators[0]);

    const state = await programState.val();
    expect(state.activeVotes[0].toString()).toEqual(blockHash.toString());

    const votableBlock = await program.account.votableBlock.fetch(votableBlockPDA);

    expect(votableBlock.miner.toString()).toEqual(miner.publicKey.toString());
    expect(votableBlock.blockHash.toString()).toEqual(blockHash.toString());
    expect(votableBlock.approveVotes.toString()).toEqual("0");
    expect(votableBlock.rejectVotes.toString()).toEqual("0");
    expect(votableBlock.expiresAt.toNumber()).toBeGreaterThan(new Date().getTime() / 1000);
    expect(votableBlock.expiresAt.toNumber()).toBeLessThan(
      new Date().getTime() / 1000 + 60 * 60 * 5
    );
  });

  it("Casts votes on a block", async () => {
    const { blockHash, votableBlockPDA } = await proposeBlockForVoting(validators[0]);

    await castVoteOnBlock(validators[0], blockHash, true);

    // Each validator can only vote once.
    await expect(castVoteOnBlock(validators[0], blockHash, true)).rejects.toThrowError(/Error/);

    await castVoteOnBlock(validators[1], blockHash, false);
    await castVoteOnBlock(validators[2], blockHash, true);

    const votableBlock = await program.account.votableBlock.fetch(votableBlockPDA);

    expect(votableBlock.approveVotes.toString()).toEqual("10000");
    expect(votableBlock.rejectVotes.toString()).toEqual("5000");
  });

  it("Finalizes approved blocks", async () => {
    const { blockHash } = await proposeBlockForVoting(validators[0]);

    await castVoteOnBlock(validators[0], blockHash, true);

    await expect(finalizeBlockApproval(validators[0], blockHash)).rejects.toThrowError(
      /ApprovalThresholdNotReached/
    );

    await castVoteOnBlock(validators[1], blockHash, true);

    await finalizeBlockApproval(validators[0], blockHash);

    const block = await approvedBlock.val(blockHash);
    expect(block.blockHash.toString()).toEqual(blockHash.toString());
  });

  it("Finalizes rejected blocks", async () => {
    const { blockHash } = await proposeBlockForVoting(validators[0]);

    await castVoteOnBlock(validators[0], blockHash, false);

    await expect(finalizeBlockRejection(validators[0], blockHash)).rejects.toThrowError(
      /RejectionThresholdNotReached/
    );

    await castVoteOnBlock(validators[1], blockHash, false);

    await finalizeBlockRejection(validators[0], blockHash);
  });

  it("Collects validator rewards for correctly approved blocks", async () => {
    const { blockHash } = await proposeBlockForVoting(validators[0]);

    await castVoteOnBlock(validators[0], blockHash, true);
    await castVoteOnBlock(validators[1], blockHash, true);

    await expect(collectValidatorReward(validators[0], blockHash)).rejects.toThrowError(
      /VotingNotEnded/
    );

    await finalizeBlockApproval(validators[0], blockHash);

    await collectValidatorReward(validators[0], blockHash);
    const validator = await stakedValidator.val(validators[0].publicKey);

    expect(validator.stake.toString()).toEqual("5050");
  });
});
