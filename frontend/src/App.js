import './App.css';
import { useEffect, useState } from 'react';
import idl from './idl.json';
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program, AnchorProvider, web3, utils, BN } from '@project-serum/anchor';
import { Buffer } from 'buffer';

window.Buffer = Buffer;


const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl('devnet');

const opts = {
  preFlightCommitment: 'processed',
};

const { SystemProgram } = web3;

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');


  const getProvider = () => {
    const connection = new Connection(network, opts.preFlightCommitment);
    const provider = new AnchorProvider(connection, window.solana, opts.preFlightCommitment);
    return provider;
  };

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;
      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet is installed');
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log('connected with public key:', response.publicKey.toString());
          setWalletAddress(response.publicKey.toString());
        } else {
          console.log('Other wallet is installed');
        }
      } else {
        console.log('Please install Phantom wallet');
      }
    } catch (error) {
      console.log(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;
    if (solana) {
      const response = await solana.connect();
      console.log("Connected with public key: ", response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }

  };

  const donate = async publicKey => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.donate(new BN(0.2 * LAMPORTS_PER_SOL), {
        accounts: { campaign: publicKey, user: provider.wallet.publicKey, systemProgram: SystemProgram.programId }
      });
      console.log('Donated some money to campaign with address', publicKey.toString());
      await getCampaigns();

    } catch (error) {
      console.log(error);
    }
  }

  const withdraw = async publicKey => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.withdraw(new BN(0.2 * LAMPORTS_PER_SOL), {
        accounts: { campaign: publicKey, user: provider.wallet.publicKey }
      });

      console.log('Withdraw money from campaign with address', publicKey.toString());
      await getCampaigns();
    } catch (error) {
      console.log(error);
    }
  };

  const createCampaign = async () => {

    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const [campaign] = await PublicKey.findProgramAddress([
        utils.bytes.utf8.encode("CAMPAIGN_DEMO"),
        provider.wallet.publicKey.toBuffer()
      ], program.programId);

      await program.rpc.create(name, description, { accounts: { campaign, user: provider.wallet.publicKey, systemProgram: SystemProgram.programId } });
      console.log('Campaign created successfully with address', campaign.toString());
    } catch (error) {
      console.log('Error creating campaign Account: ', error);
    }
  };

  const getCampaigns = async () => {
    const connection = new Connection(network, opts.preFlightCommitment);
    const provider = getProvider()
    const program = new Program(idl, programID, provider);
    Promise.all(
      (await connection.getProgramAccounts(programID)).map(
        async campaign => ({
          ...(await program.account.campaign.fetch(campaign.pubkey)),
          pubkey: campaign.pubkey,
        })
      )).then(campaigns => setCampaigns(campaigns));
  }


  const renderNotConnectedContainer = () => {
    return <button onClick={connectWallet}>Connect Wallet</button>;
  };

  const renderConnectedContainer = () => (
    <>
      <form>
        <div>
          <label>Campaign Name</label>
          <input type="text" placeholder="Campaign Name" onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label>Campaign Description</label>
          <input type="text" placeholder="Campaign Description" onChange={e => setDescription(e.target.value)} />
        </div>
      </form>
      <button onClick={createCampaign}>Create Campaign</button>
      <br />
      <button onClick={getCampaigns}>Get a list of campaigns</button>
      <br />
      {campaigns.map(campaign => (
        <div key={campaign.pubkey.toString()}>
          <p>Campaign Id: {campaign.pubkey.toString()}</p>
          <p>Balance: {(campaign.amountDonated / LAMPORTS_PER_SOL).toString()}</p>
          <p>{campaign.name}</p>
          <p>{campaign.description}</p>
          <button onClick={() => donate(campaign.pubkey)}>Donate</button>
          <button onClick={() => withdraw(campaign.pubkey)}>Withdraw</button>
        </div>
      ))}
    </>
  );

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };

    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);


  return <div className='App'>{walletAddress ? renderConnectedContainer() : renderNotConnectedContainer()}</div>
};

export default App;
