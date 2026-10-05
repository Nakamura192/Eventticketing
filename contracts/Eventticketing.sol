
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract EventTicketing is ERC721 {

using ECDSA for bytes32;
using MessageHashUtils for bytes32;

constructor() ERC721 ("EventTicket", "EVT") {}

    struct  Event{
    uint256 id;
    address organizer;
    string name;
    string description;
    string venue;
    uint256 date;
    uint256 ticketPrice;
    uint256 maxTickets;
    uint256 ticketsSold;
   
    bool active;
   }

   uint256 public eventCount;
   uint256 public ticketCount;
   
   mapping (uint256 => Event) public events;
   mapping (uint256 => uint256) public ticketEvent;
   mapping (uint256 => bool) public ticketRedeemed;
   mapping (uint256 => mapping (address => bool)) public eventStaff;
   mapping (uint256 => uint256) public eventBalance;
   mapping(uint256 => uint256) public redemptionNonce;
   

   error InvalidEventDate();
   error InvalidTicketPrice();
   error InvalidTicketSupply();
   error EventDoesNotExist();
   error EventAlreadyCancelled();
   error CheckInNotOpen();
   error NotOrganizer();
   error EventNotActive();
   error EventSoldOut();
   error EventAlreadyStarted();
   error IncorrecTicketPrice();
   error TicketDoesNotExist();
   error TicketAlreadyRedeemed();
   error NotTicketOwner();
   error NotAuthorizedStaff();
   error NothingToWithdraw();
   error TransferFailed();
   error RefundNotAvailable();
   error EventCancelled();
   error EventNotFinished();
   error InvalidSignature();
   error SignatureExpired();

   event EventCreated(
    uint256 indexed eventId,
    address indexed organizer,
    string name,
    uint256 date,
    uint256 ticketPrice,
    uint256 maxTickets
   );

   event TicketPurchased(
    uint256 indexed ticketId,
    uint256 indexed eventId,
    address indexed buyer
   );
   
   event TicketRedeemed(
    uint256 indexed ticketId,
    uint256 indexed eventId,
    address indexed redeemer
   );

   event EventCancellation(uint256 indexed eventId);

   event EventStaffUpdated(
    uint256 indexed eventId,
    address indexed staff,
    bool authorized
   );


   modifier onlyOrganizer(
    uint256 _eventId
   ) {
    if (_eventId == 0 || _eventId > eventCount) {
        revert EventDoesNotExist();
    }

    if (msg.sender != events[_eventId].organizer) {
        revert NotOrganizer();
    }
    _;
   }

   function createEvent (
    string memory _eventName,
    string memory _description,
    string memory _venue,
    uint256 _date,
    uint256 _ticketPrice,
    uint256 _maxTickets

   ) public {

    if (_date <= block.timestamp) {
        revert InvalidEventDate();
    }
    if (_ticketPrice == 0) {
        revert InvalidTicketPrice ();
    }
    
    if (_maxTickets == 0) {
        revert InvalidTicketSupply();
    }

    eventCount ++;


    events[eventCount] = Event (
        eventCount,
        msg.sender,
        _eventName,
        _description,
        _venue,
        _date,
        _ticketPrice,
        _maxTickets,
        0,
        true

    );

    emit EventCreated(eventCount, msg.sender, _eventName, _date, _ticketPrice, _maxTickets);
   }

   function cancelEvent(uint256 _eventId) public onlyOrganizer(_eventId) {

     if (!events[_eventId].active){
        revert EventAlreadyCancelled();
    }
     if (block.timestamp >= events[_eventId].date) {
        revert EventAlreadyStarted();
     }
    events[_eventId].active = false;
    emit EventCancellation(_eventId);
   }

    function setEventStaff (uint256 _eventId, address _staff, bool _authorized) public
   onlyOrganizer(_eventId)
    {
        eventStaff[_eventId][_staff] = _authorized;
        emit EventStaffUpdated(_eventId, _staff, _authorized);
   }


   function buyTicket (uint256 _eventId) public payable {

    if (_eventId == 0 || _eventId > eventCount) {
        revert EventDoesNotExist();
    }

    Event storage eventInfo = events[_eventId] ;
    if (!eventInfo.active) {
        revert EventNotActive();
    }

    if (eventInfo.ticketsSold >= eventInfo.maxTickets) {
        revert EventSoldOut();
    }

    if (block.timestamp >= eventInfo.date) {
        revert EventAlreadyStarted();
    }

    if (msg.value != eventInfo.ticketPrice) {
        revert IncorrecTicketPrice();
    }

    eventInfo.ticketsSold++;
    eventBalance[_eventId] += msg.value;
    ticketCount++;
    ticketEvent[ticketCount] = _eventId;
    _mint(msg.sender, ticketCount);

    emit TicketPurchased(ticketCount, _eventId, msg.sender);


   }

   function redeemTicket(uint256 _ticketId,uint256 _deadline, bytes memory _signature) public {

    if (_ticketId == 0 || _ticketId > ticketCount) {
        revert TicketDoesNotExist();
    }

    uint256 eventId = ticketEvent[_ticketId];
    Event storage eventInfo = events[eventId];
    
    if(!eventStaff[eventId][msg.sender] &&
    msg.sender != eventInfo.organizer) {
        revert NotAuthorizedStaff();
    }
    

    if (ticketRedeemed[_ticketId]) {
        revert TicketAlreadyRedeemed();
    }
    if(!eventInfo.active){
        revert EventCancelled();
    }
    if(block.timestamp + 2 hours < eventInfo.date) {
        revert CheckInNotOpen();
    }
    
    if (block.timestamp > _deadline) {
        revert SignatureExpired();
    }

    bytes32 messageHash = keccak256(
        abi.encodePacked(
            address(this),
            block.chainid,
            _ticketId,
            _deadline,
            redemptionNonce[_ticketId]
        )
    );

    address signer = messageHash
        .toEthSignedMessageHash()
        .recover(_signature);
    if (signer != ownerOf(_ticketId)) {
        revert InvalidSignature();
    }

    ticketRedeemed[_ticketId] = true;
    redemptionNonce[_ticketId]++;

    emit TicketRedeemed(_ticketId, ticketEvent[_ticketId], msg.sender);
   }

  
   function withdrawFunds(uint256 _eventId) public onlyOrganizer(_eventId) {

    Event storage eventInfo = events[_eventId];

    if (!eventInfo.active){
        revert EventCancelled();
    }
    if (block.timestamp < eventInfo.date) {
        revert EventNotFinished();
    }
    
    uint256 amount = eventBalance[_eventId];
    if(amount == 0) {
        revert NothingToWithdraw();
    } 
    eventBalance[_eventId] = 0;

    (bool success, ) = payable(msg.sender).call{value: amount}("");

    if(!success) {
        revert TransferFailed();
    }
   }

   function refundTicket (uint256 _ticketId) public {

    if(_ticketId == 0 || _ticketId > ticketCount) {
        revert TicketDoesNotExist();
    }
    uint256 eventId = ticketEvent[_ticketId];

    Event storage eventInfo = events[eventId];




    if(eventInfo.active) {
        revert RefundNotAvailable();
    }

    if(ticketRedeemed[_ticketId]){
        revert TicketAlreadyRedeemed();
    }

    
    if (ownerOf(_ticketId) != msg.sender) {

        revert NotTicketOwner();
    }

    uint256 refundAmount = eventInfo.ticketPrice;
    eventBalance[eventId] -= refundAmount;
    _burn(_ticketId);
    (bool success, ) = payable(msg.sender).call{value: refundAmount}("");

    if(!success) {
        revert TransferFailed();
    }
   }
}