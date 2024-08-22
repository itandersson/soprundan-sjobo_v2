#!/usr/bin/env python

import asyncio
import uuid
from collections import defaultdict
from typing import Literal, Optional, Union

import websockets
from django.conf import settings
from django.core.signing import TimestampSigner
from pydantic import BaseModel, Field, RootModel, ValidationError
from websockets import WebSocketClientProtocol
from websockets.server import serve

from umap.models import Map, User  # NOQA


class Connections:
    def __init__(self):
        self._connections: set = set()
        self._ids: dict[WebSocketClientProtocol, str] = dict()

    def join(self, websocket: WebSocketClientProtocol):
        self._connections.add(websocket)
        _id = str(uuid.uuid4())
        self._ids[websocket] = _id
        return _id

    def leave(self, websocket: WebSocketClientProtocol):
        self._connections.remove(websocket)
        del self._ids[websocket]

    def get(self, id):
        # use an iterator to stop iterating as soon as we found
        return next(k for k, v in self._ids.items() if v == id)

    def get_id(self, websocket: WebSocketClientProtocol):
        return self._ids[websocket]

    def get_other_peers(self, websocket):
        return self._connections - {websocket}

    def get_all_peers(self):
        return self._connections


# Contains the list of websocket connections handled by this process.
# It's a mapping of map_id to a set of the active websocket connections
CONNECTIONS: defaultdict[Connections] = defaultdict(Connections)


class JoinRequest(BaseModel):
    kind: Literal["join"] = "join"
    token: str


class OperationMessage(BaseModel):
    """Message sent from one peer to all the others"""

    kind: Literal["operation"] = "operation"
    verb: Literal["upsert", "update", "delete"]
    subject: Literal["map", "layer", "feature"]
    metadata: Optional[dict] = None
    key: Optional[str] = None


class PeerMessage(BaseModel):
    """Message sent from a specific peer to a specific one"""

    kind: Literal["peermessage"] = "peermessage"
    sender: str
    recipient: str
    # The message can be whatever the peers want. It's not checked by the server.
    message: dict


class ServerRequest(BaseModel):
    """A request towards the server"""

    kind: Literal["server"] = "server"
    action: Literal["list-peers"]


class Request(RootModel):
    """Any message coming from the websocket should be one of these, and will be rejected otherwise."""

    root: Union[ServerRequest, PeerMessage, OperationMessage] = Field(
        discriminator="kind"
    )


class JoinResponse(BaseModel):
    """Server response containing the list of peers"""

    kind: Literal["join-response"] = "join-response"
    peers: list
    uuid: str


class ListPeersResponse(BaseModel):
    kind: Literal["list-peers"] = "list-peers"
    peers: list


async def join_and_listen(
    map_id: int, permissions: list, user: str | int, websocket: WebSocketClientProtocol
):
    """Join a "room" with other connected peers, and wait for messages."""
    print(f"{user} joined room #{map_id}")
    connections: Connections = CONNECTIONS[map_id]
    _id: str = connections.join(websocket)

    # Assign an ID to the joining peer and return it the list of connected peers.
    peers = [connections.get_id(p) for p in connections.get_all_peers()]
    response = JoinResponse(uuid=_id, peers=peers)
    await websocket.send(response.model_dump_json())

    # Notify all other peers of the new list of connected peers.
    message = ListPeersResponse(peers=peers)
    websockets.broadcast(
        connections.get_other_peers(websocket), message.model_dump_json()
    )

    try:
        async for raw_message in websocket:
            # recompute the peers list at the time of message-sending.
            # as doing so beforehand would miss new connections
            peers = connections.get_other_peers(websocket)
            try:
                incoming = Request.model_validate_json(raw_message)
            except ValidationError as e:
                error = f"An error occurred when receiving the following message: {raw_message}"
                print(error, e)
            else:
                match incoming.root:
                    # Broadcast all operation messages to connected peers
                    case OperationMessage():
                        websockets.broadcast(peers, raw_message)

                    # Send peer messages to the proper peer
                    case PeerMessage(recipient=_id):
                        peer = connections.get(_id)
                        if peer:
                            await peer.send(raw_message)

    finally:
        # On disconnect, remove the connection from the pool
        connections.leave(websocket)

        # TODO: refactor this in a separate method.
        # Notify all other peers of the new list of connected peers.
        peers = [connections.get_id(p) for p in connections.get_all_peers()]
        message = ListPeersResponse(peers=peers)
        websockets.broadcast(
            connections.get_other_peers(websocket), message.model_dump_json()
        )


async def handler(websocket):
    """Main WebSocket handler.

    Check if the permission is granted and let the peer enter a room.
    """
    raw_message = await websocket.recv()

    # The first event should always be 'join'
    message: JoinRequest = JoinRequest.model_validate_json(raw_message)
    signed = TimestampSigner().unsign_object(message.token, max_age=30)
    user, map_id, permissions = signed.values()

    # Check if permissions for this map have been granted by the server
    if "edit" in signed["permissions"]:
        await join_and_listen(map_id, permissions, user, websocket)


def run(host: str, port: int):
    # TODO: put this in the tests

    # server = Request.model_validate(dict(kind="server", action="peerinfo")).root
    # assert type(server) is ServerRequest

    # operation = Request.model_validate(
    #     dict(kind="operation", verb="upsert", subject="map", metadata={}, key="key")
    # ).root

    # assert type(operation) is OperationMessage

    if not settings.WEBSOCKET_ENABLED:
        msg = (
            "WEBSOCKET_ENABLED should be set to True to run the WebSocket Server. "
            "See the documentation at "
            "https://docs.umap-project.org/en/stable/config/settings/#websocket_enabled "
            "for more information."
        )
        print(msg)
        exit(1)

    async def _serve():
        async with serve(handler, host, port):
            print(f"Waiting for connections on {host}:{port}")
            await asyncio.Future()  # run forever

    asyncio.run(_serve())
