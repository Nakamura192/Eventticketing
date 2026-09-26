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
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [maxTickets, setMaxTickets] = useState("");
  const [redemptionSignature, setRedemptionSignature] =
  useState<`0x${string}` | null>(null);
  const [staffAddress, setStaffAddress] = useState("");
 const [staffAuthorized, setStaffAuthorized] = useState<Record<string, boolean>>({});
  

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
      await loadMyEvents(address);
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

  async function loadMyEvents(address: string) {
  try {
    const count = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: EventTicketingAbi,
      functionName: "eventCount",
    });

    const organizerEvents = [];

    for (let i = 1n; i <= count; i++) {
      const eventData = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: EventTicketingAbi,
        functionName: "events",
        args: [i],
      });

      if (eventData[1].toLowerCase() === address.toLowerCase()) {
        organizerEvents.push({
          eventId: i,
          event: eventData,
        });
      }
    }
    console.log("My organizer events:", organizerEvents);
    setMyEvents(organizerEvents);
    
  } catch (error) {
    console.error("Failed to load organizer events:", error);
  }
}
  useEffect(() => {
    if (!window.ethereum) return;

   const handleAccountsChanged = async (accounts: unknown) => {
  const addresses = accounts as string[];

  if (addresses.length === 0) {
    setAccount(null);
    setChainId(null);
    setMyEvents([]);
    setMyTickets([]);
  } else {
    const newAddress = addresses[0];

    setAccount(newAddress);

    await loadMyTickets(newAddress);
    await loadMyEvents(newAddress);
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

    const authorized = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: EventTicketingAbi,
    functionName: "eventStaff",
    args: [eventId, staffAddress],
  });

  console.log("Staff authorization status:", authorized);
  setStaffAuthorized((prev) => ({
  ...prev,
  [eventId.toString()]: authorized,
}));

  } catch (error) {
    console.error("Staff authorization failed:", error);
    alert("Failed to authorize staff wallet. Check the console.");
  }
}

async function revokeStaff(
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
      args: [eventId, staffAddress, false],
      account: account as `0x${string}`,
    });

    console.log("Staff revocation transaction:", hash);

    alert("Revoking staff authorization. Waiting for confirmation...");

    await publicClient.waitForTransactionReceipt({ hash });

    alert("Staff authorization revoked successfully!");

    const authorized = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: EventTicketingAbi,
      functionName: "eventStaff",
      args: [eventId, staffAddress],
    });

    console.log("Staff authorization status:", authorized);

    setStaffAuthorized((prev) => ({
      ...prev,
      [eventId.toString()]: authorized,
    }));
  } catch (error) {
    console.error("Staff revocation failed:", error);
    alert("Failed to revoke staff authorization. Check the console.");
  }
}
    async function cancelEvent(eventId: bigint) {
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
      functionName: "cancelEvent",
      args: [eventId],
      account: account as `0x${string}`,
    });

    console.log("Cancel event transaction:", hash);

    alert("Cancelling event. Waiting for confirmation...");

    await publicClient.waitForTransactionReceipt({ hash });

    alert("Event cancelled successfully!");

    await loadMyEvents(account);
  } catch (error) {
    console.error("Cancel event failed:", error);
    alert("Failed to cancel event. Check the console.");
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

  <div>
  <h2>Organizer Dashboard</h2>

  {myEvents.length === 0 ? (
  <p>You have not created any events.</p>
) : (
  myEvents.map((item) => {
    const ticketsSold = Number(item.event[8]);
    const maxTickets = Number(item.event[7]);
    const salesPercentage =
      maxTickets > 0 ? (ticketsSold / maxTickets) * 100 : 0;

    return (
      <div key={item.eventId.toString()}>
        <h3>{item.event[2]}</h3>

        <p>
          <strong>Venue:</strong> {item.event[4]}
        </p>

        <p>
          <strong>Date:</strong>{" "}
          {new Date(Number(item.event[5]) * 1000).toLocaleString()}
        </p>

        <p>
          <strong>Tickets Sold:</strong>{" "}
          {item.event[8].toString()} / {item.event[7].toString()}
        </p>

        <p>
          <strong>Tickets Remaining:</strong>{" "}
          {(item.event[7] - item.event[8]).toString()}
        </p>

        <p>
          <strong>Sales:</strong>{" "}
          {salesPercentage.toFixed(1)}%
        </p>

        <div
          style={{
            width: "100%",
            height: "10px",
            backgroundColor: "#e0e0e0",
            borderRadius: "5px",
            overflow: "hidden",
            marginTop: "5px",
            marginBottom: "15px",
          }}
        >
          <div
            style={{
              width: `${Math.min(salesPercentage, 100)}%`,
              height: "100%",
              backgroundColor: "#4caf50",
            }}
          />
        </div>

        <p>
          <strong>Revenue:</strong>{" "}
          {formatEther(item.event[6] * item.event[8])} ETH
        </p>

        <p>
          <strong>Status:</strong>{" "}
          {item.event[9] ? "Active" : "Cancelled"}
        </p>

        {item.event[9] && (
          <>
            <input
              type="text"
              placeholder="Staff wallet address"
              value={staffAddress}
              onChange={(e) => setStaffAddress(e.target.value)}
            />

            <button
              onClick={() => {
                if (!staffAddress) {
                  alert("Please enter a staff wallet address.");
                  return;
                }

                authorizeStaff(
                  item.eventId,
                  staffAddress as `0x${string}`
                );
              }}
            >
              Authorize Staff
            </button>

            {staffAuthorized[item.eventId.toString()] && (
              <button
                onClick={() => {
                  if (!staffAddress) {
                    alert("Please enter the staff wallet address.");
                    return;
                  }

                  const confirmed = window.confirm(
                    "Are you sure you want to revoke this staff member's authorization?"
                  );

                  if (confirmed) {
                    revokeStaff(
                      item.eventId,
                      staffAddress as `0x${string}`
                    );
                  }
                }}
              >
                Revoke Staff
              </button>
            )}

            <p>
              <strong>Staff Status:</strong>{" "}
              {staffAuthorized[item.eventId.toString()]
                ? "Authorized"
                : "Not Authorized"}
            </p>
          </>
        )}

        {item.event[9] && (
          <button
            onClick={() => {
              const confirmed = window.confirm(
                "Are you sure you want to cancel this event?"
              );

              if (confirmed) {
                cancelEvent(item.eventId);
              }
            }}
          >
            Cancel Event
          </button>
        )}
      </div>
    );
  })
)}
</div>

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