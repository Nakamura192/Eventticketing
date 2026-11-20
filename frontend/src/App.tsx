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
import { QRCodeSVG } from "qrcode.react";
import { Html5QrcodeScanner } from "html5-qrcode";

function App() {
  
  // Theme preference: dark by default
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const savedTheme = localStorage.getItem("event-ticketing-theme");
    return savedTheme === "light" ? "light" : "dark";
  });

  // Apply theme and save preference
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("event-ticketing-theme", theme);
  }, [theme]);

  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [eventTickets, setEventTickets] = useState<any[]>([]);
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [checkInDeadline, setCheckInDeadline] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [maxTickets, setMaxTickets] = useState("");
  const [staffAddress, setStaffAddress] = useState("");
  const [staffAuthorized, setStaffAuthorized] = useState<Record<string, boolean>>({});
  
  const [ticketRedemptionData, setTicketRedemptionData] = useState<
    Record<
      string,
      {
        signature: `0x${string}`;
        deadline: bigint;
      }
    >
  >({});
  const [redemptionInput, setRedemptionInput] = useState("");
  const [redemptionLoading, setRedemptionLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [autoPreview, setAutoPreview] = useState(false);
  const [redemptionPreview, setRedemptionPreview] = useState<{
  ticketId: bigint;
  owner: string;
  eventName: string;
  redeemed: boolean;
  deadline: bigint;
  expired: boolean;
  authorized: boolean;
} | null>(null);

 

  useEffect(() => {
    if (!scannerActive) {
      return;
    }

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      false
    );

    scanner.render(
      (decodedText) => {
        console.log("QR code scanned:", decodedText);

        try {
          const parts = decodedText.split("|");

          if (parts.length !== 3) {
            throw new Error("Invalid redemption QR format");
          }

          const [ticketId, deadline, signature] = parts;

         if (
          !ticketId ||
          !deadline ||
          !signature ||
          !signature.startsWith("0x")
        ) {
          throw new Error("Invalid redemption authorization");
        }

        if (!/^\d+$/.test(ticketId)) {
          throw new Error("Invalid ticket ID");
        }

        if (!/^\d+$/.test(deadline)) {
          throw new Error("Invalid authorization deadline");
        }

        if (!/^0x[a-fA-F0-9]{130}$/.test(signature)) {
          throw new Error("Invalid Ethereum signature");
        }

          const authorization = JSON.stringify({
            ticketId,
            deadline,
            signature,
          });

          console.log(
            "Converted QR authorization:",
            authorization
          );

          setRedemptionInput(authorization);
          setRedemptionPreview(null);
          setAutoPreview(true);
          setScannerActive(false);

          scanner.clear().catch((error) => {
            console.error("Failed to stop QR scanner:", error);
          });
        } catch (error) {
          console.error("QR authorization processing failed:", error);

          alert(
            "Invalid redemption QR code. Please scan a valid ticket authorization."
          );
        }
      },
      () => {
        // Ignore continuous "QR code not found" messages.
      }
    );

    return () => {
      scanner.clear().catch((error) => {
        console.error("Failed to clean up QR scanner:", error);
      });
    };
  }, [scannerActive]);

  useEffect(() => {
  if (!autoPreview) {
    return;
  }

  if (!redemptionInput) {
    return;
  }

  setAutoPreview(false);

  previewRedemptionAuthorization();
}, [autoPreview, redemptionInput]);



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
    !checkInDeadline ||
    !ticketPrice ||
    !maxTickets
  ) {
    alert("Please fill in all fields.");
    return;
  }

  const eventDateMs = new Date(eventDate).getTime();
  const checkInDeadlineMs = new Date(checkInDeadline).getTime();

  if (
    !Number.isFinite(eventDateMs) ||
    !Number.isFinite(checkInDeadlineMs)
  ) {
    alert("Please enter valid event and check-in dates.");
    return;
  }

  const walletClient = getWalletClient();

  const timestamp = BigInt(Math.floor(eventDateMs / 1000));

  const checkInDeadlineTimestamp = BigInt(
    Math.floor(checkInDeadlineMs / 1000)
  );

  if (checkInDeadlineTimestamp <= timestamp) {
    alert("Check-in deadline must be after the event date and time.");
    return;
  }

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
      checkInDeadlineTimestamp,
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
    setCheckInDeadline("");
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

async function requestRefund(ticketId: bigint) {
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
      functionName: "refundTicket",
      args: [ticketId],
      account: account as `0x${string}`,
    });

    alert("Refund transaction submitted. Waiting for confirmation...");

    await publicClient.waitForTransactionReceipt({ hash });

    alert("Refund successful!");

    window.location.reload();
  } catch (error) {
    console.error("Refund failed:", error);
    alert("Refund failed. Check the console for details.");
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

      let owner: `0x${string}`;

      try {
        owner = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: EventTicketingAbi,
          functionName: "ownerOf",
          args: [i],
        });
      } catch (error) {
        console.log(
          "Skipping burned or nonexistent ticket:",
          i.toString()
        );
        continue;
      }

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

        const eventData = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: EventTicketingAbi,
          functionName: "events",
          args: [eventId],
        });

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
    console.log("My tickets loaded:", ownedTickets);
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

    await loadEventTickets(organizerEvents);
    
  } catch (error) {
    console.error("Failed to load organizer events:", error);
  }
}

async function loadEventTickets(events: any[]) {
  try {
    const count = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: EventTicketingAbi,
      functionName: "ticketCount",
    });

    const organizerTickets = [];

    for (let i = 1n; i <= count; i++) {
      const eventId = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: EventTicketingAbi,
        functionName: "ticketEvent",
        args: [i],
      });

      const matchingEvent = events.find(
        (item) => item.eventId === eventId
      );

      if (!matchingEvent) {
        continue;
      }

      let owner: `0x${string}`;

      try {
        owner = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: EventTicketingAbi,
          functionName: "ownerOf",
          args: [i],
        });
      } catch (error) {
        console.log("Skipping burned ticket:", i.toString());
        continue;
      }

      const redeemed = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: EventTicketingAbi,
        functionName: "ticketRedeemed",
        args: [i],
      });

      organizerTickets.push({
        ticketId: i,
        eventId,
        owner,
        redeemed,
      });
    }

    console.log("Organizer tickets:", organizerTickets);

    setEventTickets(organizerTickets);
  } catch (error) {
    console.error("Failed to load organizer tickets:", error);
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
    
    const ticketOwner = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: EventTicketingAbi,
      functionName: "ownerOf",
      args: [ticketId],
    });

    if (ticketOwner.toLowerCase() !== account.toLowerCase()) {
      throw new Error(
        "Only the current ticket owner can sign the redemption authorization."
      );
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

async function handleRedemptionInput() {
  try {
    if (!account) {
      alert("Please connect your wallet.");
      return;
    }

    if (chainId !== 11155111) {
      alert("Please switch your wallet to Sepolia.");
      return;
    }

    if (!redemptionInput.trim()) {
      alert("Please paste a redemption authorization.");
      return;
    }

    const data = JSON.parse(redemptionInput);

    if (
      !data.ticketId ||
      !data.deadline ||
      !data.signature
    ) {
      alert(
        "Invalid authorization. Ticket ID, deadline, and signature are required."
      );
      return;
    }

    setRedemptionLoading(true);

    await redeemTicketOnChain(
      BigInt(data.ticketId),
      BigInt(data.deadline),
      data.signature as `0x${string}`
    );

    setRedemptionInput("");
  } catch (error) {
      console.error("Redemption authorization processing failed:", error);
      alert(
        `Authorization processing failed:\n\n${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
   finally {
    setRedemptionLoading(false);
  }
}

async function previewRedemptionAuthorization() {
  try {
    if (!redemptionInput.trim()) {
      alert("Please paste a redemption authorization.");
      return;
    }

    const data = JSON.parse(redemptionInput);

    if (
      !data.ticketId ||
      !data.deadline ||
      !data.signature
    ) {
      alert(
        "Invalid authorization. Ticket ID, deadline, and signature are required."
      );
      return;
    }

    const ticketId = BigInt(data.ticketId);
    const deadline = BigInt(data.deadline);

    const owner = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: EventTicketingAbi,
      functionName: "ownerOf",
      args: [ticketId],
    });

    const eventId = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: EventTicketingAbi,
      functionName: "ticketEvent",
      args: [ticketId],
    });

    const eventData = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: EventTicketingAbi,
      functionName: "events",
      args: [eventId],
    });

    const currentTime = BigInt(
      Math.floor(Date.now() / 1000)
    );

    const expired = currentTime > deadline;

    const organizer = eventData[1];

    const isOrganizer =
      !!account &&
      organizer.toLowerCase() === account.toLowerCase();

    const isStaff = !!account
      ? await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: EventTicketingAbi,
          functionName: "eventStaff",
          args: [eventId, account as `0x${string}`],
        })
      : false;

    const authorized = isOrganizer || isStaff;
    console.log("Connected account:", account);
    console.log("Event organizer:", organizer);
    console.log("Is organizer:", isOrganizer);
    console.log("Is staff:", isStaff);

    const redeemed = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: EventTicketingAbi,
      functionName: "ticketRedeemed",
      args: [ticketId],
    });

    setRedemptionPreview({
      ticketId,
      owner,
      eventName: eventData[2],
      redeemed,
      deadline,
      expired,
      authorized,
    });

  } catch (error) {
    console.error("Authorization preview failed:", error);

    setRedemptionPreview(null);

    alert(
      "Unable setRedto preview authorization. Make sure the authorization is valid."
    );
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

    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: EventTicketingAbi,
      functionName: "redeemTicket",
      args: [ticketId, deadline, signature],
      account: account as `0x${string}`,
    });

    const hash = await walletClient.writeContract(request);

    console.log("Redemption transaction submitted:", hash);

    alert("Redemption transaction submitted. Waiting for confirmation...");

    await publicClient.waitForTransactionReceipt({ hash });

    alert("Ticket redeemed successfully!");

    await loadMyTickets(account);
 
  } catch (error: any) {
    console.error("Ticket redemption failed:", error);

    console.log("Error name:", error?.name);
    console.log("Short message:", error?.shortMessage);
    console.log("Details:", error?.details);
    console.log("Cause:", error?.cause);
    console.log("Error message:", error?.message);

    const message =
      error?.cause?.reason ||
      error?.cause?.data?.errorName ||
      error?.shortMessage ||
      error?.details ||
      error?.message ||
      "Unknown error";

    if (
      message.includes("EventCancelled") ||
      message.includes("Event cancelled") ||
      message.includes("EventAlreadyCancelled")
    ) {
      alert("This event has been cancelled. Its tickets cannot be redeemed.");
    } else if (
      message.includes("CheckInNotOpen") ||
      message.includes("Check-in is not open")
    ) {
      alert("Check-in is not open yet. Redemption is allowed within two hours of the event.");
    } else {
      alert(`Ticket redemption failed:\n\n${message}`);
    }
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
      
      <header className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Event Ticketing
          </h1>
          <p className="text-sm text-muted-foreground">
            Decentralized event ticketing on Ethereum
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            onClick={() =>
              setTheme((current) =>
                current === "dark" ? "light" : "dark"
              )
            }
          >
            {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>

          <button
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            onClick={connectWallet}
          >
            Connect Wallet
          </button>
        </div>
      </header>

<div className="mx-auto mt-8 w-full max-w-3xl px-4">
  <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
    <div className="mb-7">
      <h2 className="text-2xl font-bold tracking-tight text-card-foreground">
        Create Event
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Set up your event and configure its ticket details.
      </p>
    </div>

    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-card-foreground">
          Event Name
        </label>
        <input
          type="text"
          placeholder="e.g. Web3 Innovation Summit"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-card-foreground">
          Description
        </label>
        <textarea
          placeholder="Tell attendees what your event is about..."
          value={eventDescription}
          onChange={(e) => setEventDescription(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-lg border border-input bg-background px-4 py-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-card-foreground">
          Venue
        </label>
        <input
          type="text"
          placeholder="Enter event location"
          value={eventVenue}
          onChange={(e) => setEventVenue(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-card-foreground">
            Event Date and Time
          </label>
          <input
            type="datetime-local"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-3 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-card-foreground">
            Check-in Deadline
          </label>
          <input
            type="datetime-local"
            value={checkInDeadline}
            onChange={(e) => setCheckInDeadline(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-3 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-card-foreground">
            Ticket Price (ETH)
          </label>
          <input
            type="number"
            placeholder="e.g. 0.002"
            value={ticketPrice}
            onChange={(e) => setTicketPrice(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-card-foreground">
            Maximum Tickets
          </label>
          <input
            type="number"
            placeholder="e.g. 100"
            value={maxTickets}
            onChange={(e) => setMaxTickets(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <button
          onClick={createEvent}
          className="w-full rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-md transition hover:opacity-90 active:scale-[0.99]"
        >
          Create Event
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Your event will be published on the Ethereum network.
        </p>
      </div>
    </div>
  </div>
</div>

    
      
  

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
 
    <h2>Ticket Redemption</h2>

  <p>
    Paste the redemption authorization provided by the ticket owner.
  </p>
 
  <button
    onClick={() => setScannerActive(true)}
  >
    Scan QR Code
  </button>

  {scannerActive && (
    <div style={{ marginTop: "15px", maxWidth: "500px" }}>
      <div id="qr-reader"></div>

      <button
        onClick={() => setScannerActive(false)}
        style={{ marginTop: "10px" }}
      >
        Stop Scanner
      </button>
    </div>
  )}

  <textarea
    placeholder="Paste redemption authorization here..."
    value={redemptionInput}
    onChange={(e) => {
      setRedemptionInput(e.target.value);
      setRedemptionPreview(null);
    }}
    rows={5}
    style={{
      width: "100%",
      maxWidth: "600px",
      marginBottom: "10px",
    }}
  />

  <br />

  <button
    onClick={previewRedemptionAuthorization}
  >
    Preview Authorization
  </button>

  {redemptionPreview && (
    <div
      style={{
        marginTop: "20px",
        padding: "15px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        maxWidth: "600px",
      }}
    >
      <h3>Authorization Preview</h3>

      <p>
        <strong>Ticket:</strong>{" "}
        #{redemptionPreview.ticketId.toString()}
      </p>

      <p>
        <strong>Owner:</strong>{" "}
        {redemptionPreview.owner.slice(0, 6)}...
        {redemptionPreview.owner.slice(-4)}
      </p>

      <p>
        <strong>Event:</strong>{" "}
        {redemptionPreview.eventName}
      </p>

      <p>
      <strong>Ticket Status:</strong>{" "}
      {redemptionPreview.redeemed
        ? "Already Redeemed"
        : "Not Redeemed"}
    </p>

      <p>
        <strong>Authorization:</strong>{" "}
        {redemptionPreview.expired
          ? "Expired"
          : "Not Expired"}
      </p>

      <p>
        <strong>Signature:</strong>{" "}
        Verified on-chain during redemption
      </p>

      <p>
        <strong>Your Access:</strong>{" "}
        {redemptionPreview.authorized
          ? "Authorized"
          : "Not Authorized"}
      </p>

      <p>
        <strong>Authorization Expires:</strong>{" "}
        {new Date(
          Number(redemptionPreview.deadline) * 1000
        ).toLocaleString()}
      </p>
    </div>
  )}

 <button
    onClick={handleRedemptionInput}
    disabled={
      redemptionLoading ||
      !redemptionPreview ||
      redemptionPreview.expired ||
      redemptionPreview.redeemed ||
      !redemptionPreview.authorized
    }
  >
    {redemptionLoading
      ? "Redeeming..."
      : "Redeem Ticket"}
  </button>

 
<div className="mt-10 space-y-6">
  <div>
    <h2 className="text-2xl font-bold tracking-tight text-foreground">
      Organizer Dashboard
    </h2>
    <p className="mt-2 text-sm text-muted-foreground">
      Manage your events, monitor ticket sales and control event staff.
    </p>
  </div>

  {myEvents.length === 0 ? (
    <div className="rounded-2xl border border-border bg-card p-10 text-center">
      <h3 className="text-lg font-semibold text-card-foreground">
        No events yet
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        You have not created any events.
      </p>
    </div>
  ) : (
    <div className="grid gap-6">
      {myEvents.map((item) => {
        const ticketsSold = Number(item.event[9]);
        const maxTickets = Number(item.event[8]);
        const salesPercentage =
          maxTickets > 0 ? (ticketsSold / maxTickets) * 100 : 0;

       

        return (
          <div
            key={item.eventId.toString()}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="border-b border-border p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-card-foreground">
                    {item.event[2]}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.event[4]}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    item.event[10]
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {item.event[10] ? "Active" : "Cancelled"}
                </span>
              </div>

              <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Event Date</p>
                  <p className="mt-1 font-medium text-card-foreground">
                    {new Date(
                      Number(item.event[5]) * 1000
                    ).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">Check-in Deadline</p>
                  <p className="mt-1 font-medium text-card-foreground">
                    {new Date(
                      Number(item.event[6]) * 1000
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-border p-6 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Tickets Sold</p>
                <p className="mt-2 text-2xl font-bold text-card-foreground">
                  {ticketsSold}
                </p>
                <p className="text-xs text-muted-foreground">
                  of {maxTickets}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="mt-2 text-2xl font-bold text-card-foreground">
                  {maxTickets - ticketsSold}
                </p>
                <p className="text-xs text-muted-foreground">Tickets</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Sales Progress</p>
                <p className="mt-2 text-2xl font-bold text-primary">
                  {salesPercentage.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Capacity sold</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="mt-2 break-words text-xl font-bold text-card-foreground">
                  {formatEther(
                    BigInt(item.event[7]) * BigInt(item.event[9])
                  )} ETH
                </p>
                <p className="text-xs text-muted-foreground">Total sales</p>
              </div>
            </div>

            <div className="border-b border-border p-6">
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium text-card-foreground">
                  Ticket Sales
                </span>
                <span className="text-muted-foreground">
                  {salesPercentage.toFixed(1)}%
                </span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{
                    width: `${Math.min(salesPercentage, 100)}%`,
                  }}
                />
              </div>
            </div>

            {item.event[10] && (
              <div className="space-y-4 border-b border-border p-6">
                <div>
                  <h4 className="font-semibold text-card-foreground">
                    Staff Management
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Manage staff members authorized to check in ticket holders.
                  </p>
                </div>

                <input
                  type="text"
                  placeholder="Staff wallet address"
                  value={staffAddress}
                  onChange={(e) => setStaffAddress(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                />

                <div className="flex flex-wrap gap-3">
                  <button
                    className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
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
                      className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent"
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
                </div>

                <p className="text-sm text-muted-foreground">
                  Staff Status:{" "}
                  <span
                    className={`font-semibold ${
                      staffAuthorized[item.eventId.toString()]
                        ? "text-emerald-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {staffAuthorized[item.eventId.toString()]
                      ? "Authorized"
                      : "Not Authorized"}
                  </span>
                </p>
              </div>
            )}

            {item.event[10] && (
              <div className="border-b border-border p-6">
                <button
                  className="rounded-lg border border-red-500/40 px-4 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
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
              </div>
            )}

            <div className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-card-foreground">
                    Ticket Management
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    View issued tickets and their check-in status.
                  </p>
                </div>

                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {eventTickets.filter(
                    (ticket) => ticket.eventId === item.eventId
                  ).length}{" "}
                  Issued
                </span>
              </div>

              <p className="mb-4 text-sm text-muted-foreground">
                Tickets Issued:{" "}
                <span className="font-semibold text-card-foreground">
                  {eventTickets.filter(
                    (ticket) => ticket.eventId === item.eventId
                  ).length}{" "}
                  / {item.event[8].toString()}
                </span>
              </p>

              {eventTickets.filter(
                (ticket) => ticket.eventId === item.eventId
              ).length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No tickets have been purchased for this event yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {eventTickets
                    .filter(
                      (ticket) => ticket.eventId === item.eventId
                    )
                    .map((ticket) => (
                      <div
                        key={ticket.ticketId.toString()}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <p className="font-semibold text-card-foreground">
                            Ticket #{ticket.ticketId.toString()}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Owner: {ticket.owner.slice(0, 6)}...
                            {ticket.owner.slice(-4)}
                          </p>
                        </div>

                        <div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              ticket.redeemed
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-blue-500/10 text-blue-500"
                            }`}
                          >
                            {ticket.redeemed ? "Redeemed" : "Valid"}
                          </span>

                          {ticket.redeemed && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Check-in: Completed
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
   )}
</div>
</div>

{account && (
  <div>
    <h2>My Tickets</h2>

   
{myTickets.length === 0 ? (
  <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center">
    <div className="mb-3 text-4xl">🎟️</div>
    <h3 className="text-lg font-semibold text-foreground">
      No tickets yet
    </h3>
    <p className="mt-2 text-sm text-muted-foreground">
      Tickets you purchase will appear here.
    </p>
  </div>
) : (
  <div className="grid gap-6 md:grid-cols-2">
    {myTickets.map((ticket) => (
      <div
        key={ticket.ticketId.toString()}
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      >
        {/* Ticket header */}
        <div className="flex items-center justify-between border-b border-border bg-accent/40 p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Event Ticket
            </p>
            <h3 className="mt-1 text-lg font-bold text-foreground">
              Ticket #{ticket.ticketId.toString()}
            </h3>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              ticket.redeemed
                ? "bg-muted text-muted-foreground"
                : "bg-green-500/10 text-green-600"
            }`}
          >
            {ticket.redeemed ? "Redeemed" : "Valid"}
          </span>
        </div>

        {/* Event information */}
        <div className="space-y-4 p-5">
          <div>
            <h4 className="text-xl font-bold text-foreground">
              {ticket.event[2]}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {ticket.event[4]}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Event Date</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {new Date(
                  Number(ticket.event[5]) * 1000
                ).toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Ticket Price</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {formatEther(ticket.event[7])} ETH
              </p>
            </div>
          </div>

          <div className="border-t border-dashed border-border pt-4">
            <p className="mb-3 text-sm font-semibold text-foreground">
              Ticket Actions
            </p>

            <div className="flex flex-wrap gap-2">
              {!ticket.redeemed && (
                <button
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  onClick={async () => {
                    const deadline = BigInt(
                      Math.floor(Date.now() / 1000) + 3600
                    );

                    const signature = await generateRedemptionSignature(
                      ticket.ticketId,
                      deadline
                    );

                    if (signature) {
                      setTicketRedemptionData((prev) => ({
                        ...prev,
                        [ticket.ticketId.toString()]: {
                          signature,
                          deadline,
                        },
                      }));
                    }
                  }}
                >
                  Sign Authorization
                </button>
              )}

              {!ticket.event[10] && !ticket.redeemed && (
                <button
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  onClick={() => requestRefund(ticket.ticketId)}
                >
                  Claim Refund
                </button>
              )}
            </div>

            {ticketRedemptionData[ticket.ticketId.toString()] && (
              <div className="mt-5 space-y-4 rounded-xl border border-border bg-background p-4">
                <h4 className="font-semibold text-foreground">
                  Redemption Authorization
                </h4>

                <button
                  className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                  onClick={async () => {
                    const redemptionData =
                      ticketRedemptionData[ticket.ticketId.toString()];

                    const authorization = JSON.stringify({
                      ticketId: ticket.ticketId.toString(),
                      deadline: redemptionData.deadline.toString(),
                      signature: redemptionData.signature,
                    });

                    await navigator.clipboard.writeText(authorization);

                    alert("Redemption authorization copied to clipboard!");
                  }}
                >
                  Copy Authorization
                </button>

                <div className="flex flex-col items-center rounded-xl bg-white p-4">
                  <h4 className="mb-3 text-sm font-semibold text-gray-900">
                    Redemption QR Code
                  </h4>

                  {(() => {
                    const authorization = [
                      ticket.ticketId.toString(),
                      ticketRedemptionData[ticket.ticketId.toString()].deadline.toString(),
                      ticketRedemptionData[ticket.ticketId.toString()].signature,
                    ].join("|");

                    return (
                      <QRCodeSVG
                        value={authorization}
                        size={250}
                      />
                    );
                  })()}

                  <p className="mt-3 text-center text-xs text-gray-600">
                    Show this QR code to event staff for ticket redemption.
                  </p>
                </div>

                {!ticket.redeemed && (
                  <button
                    className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    onClick={async () => {
                      const redemptionData =
                        ticketRedemptionData[ticket.ticketId.toString()];

                      if (!redemptionData) {
                        alert("Please generate a redemption signature first.");
                        return;
                      }

                      await redeemTicketOnChain(
                        ticket.ticketId,
                        redemptionData.deadline,
                        redemptionData.signature
                      );
                    }}
                  >
                    Redeem Ticket
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
)}
</div>
)}

 
      
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Explore Events
            </h2>
            <p className="text-sm text-muted-foreground">
              Discover events and secure your tickets on Ethereum.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            Events created:{" "}
            <span className="font-semibold text-foreground">
              {eventCount !== null ? eventCount.toString() : "Loading..."}
            </span>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center">
            <div className="mb-3 text-4xl">🎟️</div>
            <h3 className="text-lg font-semibold text-foreground">
              No events available
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Newly created events will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => {
              const ticketsSold = Number(event[9]);
              const maxTickets = Number(event[8]);

              const salesPercentage =
                maxTickets > 0
                  ? Math.min((ticketsSold / maxTickets) * 100, 100)
                  : 0;

              const ticketsRemaining = Math.max(
                maxTickets - ticketsSold,
                0
              );

              return (
                <div
                  key={event[0].toString()}
                  className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-border bg-accent/40 px-5 py-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Event #{event[0].toString()}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        event[10]
                          ? "bg-green-500/10 text-green-600"
                          : "bg-red-500/10 text-red-600"
                      }`}
                    >
                      {event[10] ? "Active" : "Cancelled"}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-xl font-bold text-foreground">
                      {event[2]}
                    </h3>

                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {event[3]}
                    </p>

                    <div className="mt-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <span>📍</span>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Venue
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {event[4]}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span>📅</span>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Event Date
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {new Date(
                              Number(event[5]) * 1000
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 rounded-xl bg-accent/40 p-4">
                      <p className="text-xs text-muted-foreground">
                        Ticket Price
                      </p>
                      <p className="mt-1 text-2xl font-bold text-primary">
                        {formatEther(event[7])} ETH
                      </p>
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          Ticket Sales
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {ticketsSold} / {maxTickets}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${salesPercentage}%` }}
                        />
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        {ticketsRemaining} tickets remaining
                      </p>
                    </div>

                    <div className="mt-auto pt-6">
                      {event[10] ? (
                        <button
                          onClick={() =>
                            buyTicket(event[0], event[7])
                          }
                          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                        >
                          Buy Ticket
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full cursor-not-allowed rounded-lg bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground"
                        >
                          Event Cancelled
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
</div>
  )}
export default App;