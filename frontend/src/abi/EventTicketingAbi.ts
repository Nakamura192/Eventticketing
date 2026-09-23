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
] as const;