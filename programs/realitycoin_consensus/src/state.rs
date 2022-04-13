pub mod state {
    use anchor_lang::prelude::*;
    use std::mem;

    pub trait SizeToAllocate<T> {
        fn size_to_allocate() -> usize {
            8 + mem::size_of::<T>()
        }
    }

    #[account]
    pub struct ProgramState {
        pub min_stake: u64,
        pub total_staked: u64,
        pub active_votes: Vec<Pubkey>,
    }
    impl SizeToAllocate<ProgramState> for ProgramState {
        fn size_to_allocate() -> usize {
            8 + mem::size_of::<ProgramState>() + 100 * mem::size_of::<Pubkey>()
        }
    }

    #[account]
    pub struct StakedValidator {
        pub validator: Pubkey,
        pub stake: u64,
    }
    impl SizeToAllocate<StakedValidator> for StakedValidator {}

    #[account]
    pub struct VotableBlock {
        pub block_hash: Pubkey,
        pub miner: Pubkey,
        pub validator: Pubkey,
        pub approve_votes: u64,
        pub reject_votes: u64,
        pub expires_at: i64,
        pub approved: bool,
        pub voting_finalized_at: i64,
    }
    impl SizeToAllocate<VotableBlock> for VotableBlock {}

    #[account]
    pub struct VoteOnBlock {
        pub validator: Pubkey,
        pub block_hash: Pubkey,
        pub approve: bool,
        pub reward_collected: bool,
    }
    impl SizeToAllocate<VoteOnBlock> for VoteOnBlock {}

    #[account]
    pub struct ApprovedBlock {
        pub block_hash: Pubkey,
    }
    impl SizeToAllocate<ApprovedBlock> for ApprovedBlock {}
}
