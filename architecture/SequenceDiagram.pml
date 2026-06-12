@startuml
title pokemon-only-one Command Flow

actor User

participant "Room UI" as UI
participant "RoomActionBridge" as Bridge
participant "rules.js" as Rules
participant "PokemonFactory" as Factory
participant "CommandRunner" as Runner
participant "CommandRegistry" as Registry
participant "CommandModule" as Module
participant "CommandLog" as Log
database "Firestore Room" as Firestore

== New Room Initialization ==

UI -> Rules: createInitialState(options)
Rules -> Factory: createShell(options)
Factory --> Rules: GameState with BOOT_SCREEN

Rules -> Factory: createInitialCommands(options)
Factory --> Rules: [INIT_POKEMON_GAME]

Rules -> Runner: enqueue(INIT_POKEMON_GAME)
Runner -> Log: append(COMMAND_QUEUED, INIT_POKEMON_GAME)

Rules -> Runner: drainQueue(state)

Runner -> Registry: get("INIT_POKEMON_GAME")
Registry --> Runner: InitPokemonGameCommand module

Runner -> Log: append(COMMAND_STARTED, INIT_POKEMON_GAME)
Runner -> Module: run(state, INIT_POKEMON_GAME)

Module -> Log: append(SCRIPT_STARTED, INIT_POKEMON_GAME)

Module -> Runner: enqueue(CREATE_PLAYER)
Runner -> Log: append(COMMAND_QUEUED, CREATE_PLAYER)

Module -> Runner: enqueue(CREATE_ZONE area.spaceA)
Runner -> Log: append(COMMAND_QUEUED, CREATE_ZONE)

Module -> Runner: enqueue(CREATE_ZONE area.spaceB)
Runner -> Log: append(COMMAND_QUEUED, CREATE_ZONE)

Module -> Runner: enqueue(CREATE_CARD Pikachu)
Runner -> Log: append(COMMAND_QUEUED, CREATE_CARD)

Module -> Runner: enqueue(ADD_CARD_TO_ZONE card -> area.spaceA)
Runner -> Log: append(COMMAND_QUEUED, ADD_CARD_TO_ZONE)

Module -> Runner: enqueue(OPEN_SCREEN ONE_AREA_SCREEN)
Runner -> Log: append(COMMAND_QUEUED, OPEN_SCREEN)

Module --> Runner: updated state
Runner -> Log: append(COMMAND_COMPLETED, INIT_POKEMON_GAME)

loop Drain automatic setup commands
  Runner -> Registry: get(nextCommand.type)
  Registry --> Runner: command module

  Runner -> Log: append(COMMAND_STARTED, nextCommand)
  Runner -> Module: run(state, nextCommand)
  Module -> Log: append(domain event)
  Module --> Runner: updated state
  Runner -> Log: append(COMMAND_COMPLETED, nextCommand)
end

Rules --> UI: initialized GameState
UI -> Firestore: save room.gameState

== Click Card to Zoom ==

User -> UI: clicks Pikachu card

UI -> Bridge: dispatch(OPEN_CARD_ZOOM, { cardId })
Bridge -> Rules: submitAction(currentState, action)

Rules -> Registry: get("OPEN_CARD_ZOOM")
Registry --> Rules: OpenCardZoomCommand module

Rules -> Module: create({ cardId })
Module --> Rules: OPEN_CARD_ZOOM command object

Rules -> Runner: runImmediate(OPEN_CARD_ZOOM)
Runner -> Log: append(ACTION_RECEIVED, OPEN_CARD_ZOOM)
Runner -> Log: append(COMMAND_STARTED, OPEN_CARD_ZOOM)

Runner -> Module: run(state, OPEN_CARD_ZOOM)
Module -> Module: set state.display.zoom
Module -> Log: append(POPUP_OPENED, OPEN_CARD_ZOOM)
Module --> Runner: updated state

Runner -> Log: append(COMMAND_COMPLETED, OPEN_CARD_ZOOM)
Runner -> Runner: drainQueue(state)
Runner --> Rules: updated state

Rules --> Bridge: updated GameState
Bridge -> Firestore: update room.gameState
Firestore --> UI: room snapshot update
UI -> UI: render zoom popup

== Click Zoomed Card to Close ==

User -> UI: clicks zoomed card

UI -> Bridge: dispatch(CLOSE_CARD_ZOOM)
Bridge -> Rules: submitAction(currentState, action)

Rules -> Registry: get("CLOSE_CARD_ZOOM")
Registry --> Rules: CloseCardZoomCommand module

Rules -> Module: create({})
Module --> Rules: CLOSE_CARD_ZOOM command object

Rules -> Runner: runImmediate(CLOSE_CARD_ZOOM)
Runner -> Log: append(ACTION_RECEIVED, CLOSE_CARD_ZOOM)
Runner -> Log: append(COMMAND_STARTED, CLOSE_CARD_ZOOM)

Runner -> Module: run(state, CLOSE_CARD_ZOOM)
Module -> Module: clear state.display.zoom
Module -> Log: append(POPUP_CLOSED, CLOSE_CARD_ZOOM)
Module --> Runner: updated state

Runner -> Log: append(COMMAND_COMPLETED, CLOSE_CARD_ZOOM)
Runner -> Runner: drainQueue(state)
Runner --> Rules: updated state

Rules --> Bridge: updated GameState
Bridge -> Firestore: update room.gameState
Firestore --> UI: room snapshot update
UI -> UI: render one area screen

== Clear Log ==

User -> UI: clicks Clear Log

UI -> Bridge: dispatch(CLEAR_COMMAND_LOG)
Bridge -> Rules: submitAction(currentState, action)

Rules -> Registry: get("CLEAR_COMMAND_LOG")
Registry --> Rules: ClearCommandLogCommand module

Rules -> Module: create({})
Module --> Rules: CLEAR_COMMAND_LOG command object

Rules -> Runner: runImmediate(CLEAR_COMMAND_LOG)
Runner -> Log: clear(state)
Runner -> Log: append(COMMAND_LOG_CLEARED, CLEAR_COMMAND_LOG)

Runner --> Rules: updated state
Rules --> Bridge: updated GameState
Bridge -> Firestore: update room.gameState
Firestore --> UI: room snapshot update
UI -> UI: render cleared one-line log

@enduml