# ZKP Circuit Artifacts

## Circuit
Proves knowledge of `(agent_id, api_key, salt)` such that:
```
SHA256(agent_id + ":" + api_key + ":" + salt) == commitment
```

## Public Signals
- `commitment` — the SHA-256 hash (the only value revealed to the verifier)

## Required Artifacts
| File | Description |
|------|-------------|
| `verification_key.json` | Groth16 verification key (loaded by zkpService) |
| `circuit.wasm` | Compiled circuit (used client-side for proof generation) |
| `circuit_final.zkey` | Proving key (used client-side for proof generation) |

## Setup
1. Write the Circom circuit (`.circom`)
2. Compile: `circom circuit.circom --r1cs --wasm --sym`
3. Trusted setup: `snarkjs groth16 setup circuit.r1cs pot_final.ptau circuit_0000.zkey`
4. Contribute: `snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey`
5. Export vKey: `snarkjs zkey export verificationkey circuit_final.zkey verification_key.json`
6. Place `verification_key.json` in this directory.

## Fallback
Hash mode (`?mode=hash`) is available for environments where snarkjs proof
generation is not feasible. It uses a simple SHA-256 preimage check.
