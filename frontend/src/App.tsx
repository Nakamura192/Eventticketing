import { useEffect, useState } from "react";
import { getWalletClient } from "./config";
import {
  encodePacked,
  formatEther,
  keccak256,
  parseEther,
} from "viem";
import { publicClient, CONTRACT_ADDRESS } from "./config";
import { EventTicketingAbi } from "./abi/EventTicketingAbi";

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [maxTickets, setMaxTickets] = useState("");
  const [redemptionSignature, setRedemptionSignature] =
  useState<`0x${string}` | null>(null);

  const [redemptionDeadline, setRedemptionDeadline] =
    useState<bigint | null>(null);

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
  async function createEvent() {
  try {
    if (!account) {
      alert("Please connect your wallet.");
      return;
    }

    if (chainId !== 11155111) {
      alert("Please switch your wallet to Sepolia.");
      return;
    }

    if (
      !eventName ||
      !eventDescription ||
      !eventVenue ||
      !eventDate ||
      !ticketPrice ||
      !maxTickets
    ) {
      alert("Please fill in all fields.");
      return;
    }

    const walletClient = getWalletClient();

    const timestamp = BigInt(
      Math.floor(new Date(eventDate).getTime() / 1000)
    );

    const priceInWei = parseEther(ticketPrice);

    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: EventTicketingAbi,
      functionName: "createEvent",
      args: [
        eventName,
        eventDescription,
        eventVenue,
        timestamp,
        priceInWei,
        BigInt(maxTickets),
      ],
      account: account as `0x${string}`,
    });

    console.log("Create event transaction:", hash);

    alert("Event creation submitted. Waiting for confirmation...");

    await publicClient.waitForTransactionReceipt({ hash });

    alert("Event created successfully!");

    setEventName("");
    setEventDescription("");
    setEventVenue("");
    setEventDate("");
    setTicketPrice("");
    setMaxTickets("");

  } catch (error) {
    console.error("Create event failed:", error);
    alert("Failed to create event. Check the console.");
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

    const redeemed = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: EventTicketingAbi,
      functionName: "ticketRedeemed",
      args: [i],
    });

    ownedTickets.push({
      ticketId: i,
      event: eventData,
      redeemed,
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
  async function generateRedemptionSignature(
  ticketId: bigint,
  deadline: bigint
) {
  try {
    if (!account) {
      throw new Error("Wallet not connected");
    }

    if (chainId !== 11155111) {
      throw new Error("Please switch to Sepolia");
    }

    const walletClient = getWalletClient();

    const nonce = await publicClient.readContract({
  address: CONTRACT_ADDRESS,
  abi: EventTicketingAbi,
  functionName: "redemptionNonce",
  args: [ticketId],
});

console.log("Redemption nonce:", nonce.toString());

const messageHash = keccak256(
  encodePacked(
    ["address", "uint256", "uint256", "uint256", "uint256"],
    [
      CONTRACT_ADDRESS,
      BigInt(chainId),
      ticketId,
      deadline,
      nonce,
    ]
  )
);

    console.log("Message hash:", messageHash);

    const signature = await walletClient.signMessage({
      account: account as `0x${string}`,
      message: {
        raw: messageHash,
      },
    });

    console.log("Redemption signature:", signature);

    return signature;
  } catch (error) {
    console.error("Signature generation failed:", error);
    return null;
  }
}

async function redeemTicketOnChain(
  ticketId: bigint,
  deadline: bigint,
  signature: `0x${string}`
) {
  try {
    if (!account) {
      alert("Please connect your wallet.");
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
      functionName: "redeemTicket",
      args: [ticketId, deadline, signature],
      account: account as `0x${string}`,
    });

    console.log("Redemption transaction submitted:", hash);

    alert("Redemption transaction submitted. Waiting for confirmation...");

    await publicClient.waitForTransactionReceipt({ hash });

    alert("Ticket redeemed successfully!");

    await loadMyTickets(account);
  } catch (error) {
    console.error("Ticket redemption failed:", error);
    alert("Ticket redemption failed. Check the console.");
  }
}
  async function authorizeStaff(
  eventId: bigint,
  staffAddress: `0x${string}`
) {
  try {
    if (!account) {
      alert("Please connect your wallet.");
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
      functionName: "setEventStaff",
      args: [eventId, staffAddress, true],
      account: account as `0x${string}`,
    });

    console.log("Staff authorization transaction:", hash);

    alert("Authorizing staff wallet. Waiting for confirmation...");

    await publicClient.waitForTransactionReceipt({ hash });

    alert("Staff wallet authorized successfully!");

  } catch (error) {
    console.error("Staff authorization failed:", error);
    alert("Failed to authorize staff wallet. Check the console.");
  }
}

  return (
    <div>
      
      <h1>Event Ticketing DApp</h1>
            <div>
      <h2>Create Event</h2>

      <input
        type="text"
        placeholder="Event name"
        value={eventName}
        onChange={(e) => setEventName(e.target.value)}
      />

      <input
        type="text"
        placeholder="Description"
        value={eventDescription}
        onChange={(e) => setEventDescription(e.target.value)}
      />

      <input
        type="text"
        placeholder="Venue"
        value={eventVenue}
        onChange={(e) => setEventVenue(e.target.value)}
      />

      <input
        type="datetime-local"
        value={eventDate}
        onChange={(e) => setEventDate(e.target.value)}
      />

      <input
        type="number"
        placeholder="Ticket price in ETH"
        value={ticketPrice}
        onChange={(e) => setTicketPrice(e.target.value)}
      />

      <input
        type="number"
        placeholder="Maximum tickets"
        value={maxTickets}
        onChange={(e) => setMaxTickets(e.target.value)}
      />

      <button onClick={createEvent}>
        Create Event
      </button>
    </div>

    <div>
  <h2>Authorize Event Staff</h2>

  <input
    type="number"
    placeholder="Event ID"
    id="staff-event-id"
  />

  <input
    type="text"
    placeholder="Staff wallet address"
    id="staff-address"
  />

  <button
    onClick={() => {
      const eventIdInput = (
        document.getElementById("staff-event-id") as HTMLInputElement
      ).value;

      const staffAddressInput = (
        document.getElementById("staff-address") as HTMLInputElement
      ).value;

      if (!eventIdInput || !staffAddressInput) {
        alert("Please enter both Event ID and staff address.");
        return;
      }

      authorizeStaff(
        BigInt(eventIdInput),
        staffAddressInput as `0x${string}`
      );
    }}
  >
    Authorize Staff
  </button>
</div>
      
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
            <strong>Status:</strong> {ticket.redeemed ? "Redeemed" : "Valid"}
          </p>
          <div>
        Event timestamp: {ticket.event[5].toString()}
      </div>

      <div>
        Current timestamp: {Math.floor(Date.now() / 1000)}
      </div>
          <button
  onClick={async () => {
    const deadline = BigInt(
      Math.floor(Date.now() / 1000) + 3600
    );

    const signature = await generateRedemptionSignature(
      ticket.ticketId,
      deadline
    );

    if (signature) {
      setRedemptionSignature(signature);
      setRedemptionDeadline(deadline);
    }
  }}
>
  Generate Redemption Signature
</button>

{!ticket.redeemed && (
  <button
    onClick={async () => {
      if (!redemptionSignature || !redemptionDeadline) {
        alert("Please generate a redemption signature first.");
        return;
      }

      await redeemTicketOnChain(
        ticket.ticketId,
        redemptionDeadline,
        redemptionSignature
      );
    }}
  >
    Redeem Ticket
  </button>
)}

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