export const EventTicketingAbi = [
  {
    type: "function",
    name: "eventCount",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
  {
    type: "function",
    name: "events",
    stateMutability: "view",
    inputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    
    outputs: [
      {
        name: "id",
        type: "uint256",
      },
      {
        name: "organizer",
        type: "address",
      },
      {
        name: "name",
        type: "string",
      },
      {
        name: "description",
        type: "string",
      },
      {
        name: "venue",
        type: "string",
      },
      {
        name: "date",
        type: "uint256",
      },
      {
        name: "ticketPrice",
        type: "uint256",
      },
      {
        name: "maxTickets",
        type: "uint256",
      },
      {
        name: "ticketsSold",
        type: "uint256",
      },
      {
        name: "active",
        type: "bool",
      },
    ],
  },
  {
  type: "function",
  name: "buyTicket",
  stateMutability: "payable",
  inputs: [
    {
      name: "_eventId",
      type: "uint256",
    },
  ],
  outputs: [],
},
{
  type: "function",
  name: "ownerOf",
  stateMutability: "view",
  inputs: [
    {
      name: "tokenId",
      type: "uint256",
    },
  ],
  outputs: [
    {
      name: "",
      type: "address",
    },
  ],
},

{
  type: "function",
  name: "ticketCount",
  stateMutability: "view",
  inputs: [],
  outputs: [
    {
      name: "",
      type: "uint256",
    },
  ],
},
{
  type: "function",
  name: "ticketEvent",
  stateMutability: "view",
  inputs: [
    {
      name: "",
      type: "uint256",
    },
  ],
  outputs: [
    {
      name: "",
      type: "uint256",
    },
  ],
},
{
  type: "function",
  name: "redeemTicket",
  stateMutability: "nonpayable",
  inputs: [
    {
      name: "_ticketId",
      type: "uint256",
    },
    {
      name: "_deadline",
      type: "uint256",
    },
    {
      name: "_signature",
      type: "bytes",
    },
  ],
  
  outputs: [],
},
{
  type: "function",
  name: "redemptionNonce",
  stateMutability: "view",
  inputs: [
    { name: "", type: "uint256" }
  ],
  outputs: [
    { name: "", type: "uint256" }
  ],
},
{
  type: "function",
  name: "ticketRedeemed",
  stateMutability: "view",
  inputs: [
    { name: "", type: "uint256" }
  ],
  outputs: [
    { name: "", type: "bool" }
  ],
},
{
  type: "function",
  name: "createEvent",
  stateMutability: "nonpayable",
  inputs: [
    { name: "_eventName", type: "string" },
    { name: "_description", type: "string" },
    { name: "_venue", type: "string" },
    { name: "_date", type: "uint256" },
    { name: "_ticketPrice", type: "uint256" },
    { name: "_maxTickets", type: "uint256" },
  ],
  outputs: [],
},
  {
  type: "function",
  name: "setEventStaff",
  stateMutability: "nonpayable",
  inputs: [
    { name: "_eventId", type: "uint256" },
    { name: "_staff", type: "address" },
    { name: "_authorized", type: "bool" },
  ],
  outputs: [],
},
{
  type: "function",
  name: "eventStaff",
  stateMutability: "view",
  inputs: [
    { name: "", type: "uint256" },
    { name: "", type: "address" },
  ],
  outputs: [{ name: "", type: "bool" }],
},
{
  type: "function",
  name: "cancelEvent",
  stateMutability: "nonpayable",
  inputs: [
    { name: "_eventId", type: "uint256" }
  ],
  outputs: [],
},
] as const;