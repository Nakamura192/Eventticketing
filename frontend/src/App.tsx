import { useEffect, useState } from "react";
import { getWalletClient } from "./config";
import { formatEther } from "viem";
import { publicClient, CONTRACT_ADDRESS } from "./config";
import { EventTicketingAbi } from "./abi/EventTicketingAbi";

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
 const [myTickets, setMyTickets] = useState<any[]>([]);

  async function connectWallet() {
    try {
      const walletClient = getWalletClient();

      const [address] = await walletClient.requestAddresses();
      const currentChainId = await walletClient.getChainId();

      setAccount(address);
      setChainId(currentChainId);

      await loadMyTickets(address);
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  }
  async function buyTicket(eventId: bigint, ticketPrice: bigint) {
  try {
    if (!account) {
      alert("Please connect your wallet first.");
      return;
    }

    if (chainId !== 11155111) {
      alert("Please switch your wallet to Sepolia.");
      return;
    }

    const walletClient = getWalletClient();

    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: EventTicketingAbi,
      functionName: "buyTicket",
      args: [eventId],
      value: ticketPrice,
      account: account as `0x${string}`,
    });

    console.log("Transaction submitted:", hash);

    alert("Transaction submitted! Waiting for confirmation...");

    await publicClient.waitForTransactionReceipt({
      hash,
    });

    alert("Ticket purchased successfully!");

    window.location.reload();
  } catch (error) {
    console.error("Ticket purchase failed:", error);
    alert("Ticket purchase failed. Check the console for details.");
  }
}
 async function loadMyTickets(address: string) {
  try {
    const count = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: EventTicketingAbi,
      functionName: "ticketCount",
    });

    console.log("Total tickets:", count.toString());

    const ownedTickets = [];

    for (let i = 1n; i <= count; i++) {
      console.log("Checking ticket:", i.toString());

      const owner = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: EventTicketingAbi,
        functionName: "ownerOf",
        args: [i],
      });

      console.log("Ticket owner:", owner);
      console.log("Connected address:", address);

      if (owner.toLowerCase() === address.toLowerCase()) {
        console.log("Ticket belongs to connected wallet!");

        const eventId = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: EventTicketingAbi,
          functionName: "ticketEvent",
          args: [i],
        });

        console.log("Event ID:", eventId.toString());

        const eventData = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: EventTicketingAbi,
          functionName: "events",
          args: [eventId],
        });

        console.log("Event data:", eventData);

        ownedTickets.push({
          ticketId: i,
          event: eventData,
        });
      }
    }

    setMyTickets(ownedTickets);
  } catch (error) {
    console.error("FAILED TO LOAD MY TICKETS:", error);
  }
}
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const addresses = accounts as string[];

      if (addresses.length === 0) {
        setAccount(null);
        setChainId(null);
      } else {
        setAccount(addresses[0]);
      }
    };

    const handleChainChanged = (chainIdHex: unknown) => {
      const newChainId = Number(chainIdHex);

      setChainId(newChainId);
    };

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.(
        "accountsChanged",
        handleAccountsChanged
      );

      window.ethereum?.removeListener?.(
        "chainChanged",
        handleChainChanged
      );
    };
  }, []);
  const [eventCount, setEventCount] = useState<bigint | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    async function loadEvents() {
      const count = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: EventTicketingAbi,
        functionName: "eventCount",
      });

      setEventCount(count);

      const loadedEvents = [];

      for (let i = 1n; i <= count; i++) {
        const eventData = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: EventTicketingAbi,
          functionName: "events",
          args: [i],
        });

        loadedEvents.push(eventData);
      }

      setEvents(loadedEvents);
    }

    loadEvents();
  }, []);

  return (
    <div>
      <h1>Event Ticketing DApp</h1>
      <button onClick={connectWallet}>
  {account ? "Wallet Connected" : "Connect Wallet"}
</button>

{account && (
  <p>
    Connected account: {account}
  </p>
)}
{chainId && (
  <p>
    Network:{" "}
    {chainId === 11155111
      ? "Sepolia"
      : `Unknown Network (${chainId})`}
  </p>
)}

{account && (
  <div>
    <h2>My Tickets</h2>

    {myTickets.length === 0 ? (
      <p>No tickets found.</p>
    ) : (
      myTickets.map((ticket) => (
        <div key={ticket.ticketId.toString()}>
          <h3>
            Ticket #{ticket.ticketId.toString()}
          </h3>

          <p>
            <strong>Event:</strong>{" "}
            {ticket.event[2]}
          </p>

          <p>
            <strong>Venue:</strong>{" "}
            {ticket.event[4]}
          </p>

          <p>
            <strong>Date:</strong>{" "}
            {new Date(
              Number(ticket.event[5]) * 1000
            ).toLocaleString()}
          </p>

          <p>
            <strong>Price:</strong>{" "}
            {formatEther(ticket.event[6])} ETH
          </p>

          <p>
            <strong>Status:</strong> Valid
          </p>

          <hr />
        </div>
      ))
    )}
  </div>
)}
      <p>
        Events created:{" "}
        {eventCount !== null ? eventCount.toString() : "Loading..."}
      </p>

      {events.map((event) => (
        <div key={event[0].toString()}>
          <h2>{event[2]}</h2>

          <p>{event[3]}</p>

          <p>
            <strong>Venue:</strong> {event[4]}
          </p>

          <p>
            <strong>Date:</strong>{" "}
            {new Date(Number(event[5]) * 1000).toLocaleString()}
          </p>

          <p>
            <strong>Ticket Price:</strong>{" "}
            {formatEther(event[6])} ETH
          </p>

          <p>
            <strong>Tickets:</strong>{" "}
            {event[8].toString()} / {event[7].toString()}
          </p>

          <p>
            <strong>Active:</strong>{" "}
            {event[9] ? "Yes" : "No"}
          </p>
          {event[9] && (
  <button
    onClick={() => buyTicket(event[0], event[6])}
  >
    Buy Ticket
  </button>
)}
          <hr />
        </div>
      ))}
    </div>
  );
}

export default App;