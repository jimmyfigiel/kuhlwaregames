@startuml
title pokemon-only-one Object Model

skinparam classAttributeIconSize 0
skinparam linetype ortho

package "Room Layer" {
  class RoomDocument {
    +roomId: string
    +gameId: string
    +gameState: GameState
    +updatedAt
  }

  class RoomActionBridge {
    +dispatch(action)
    +saveUpdatedState(state)
  }
}

package "Game Layer" {
  class Rules {
    +createInitialState(options): GameState
    +submitAction(state, action): GameState
    -drainQueue(state): GameState
  }

  class PokemonFactory {
    +createShell(options): GameState
    +createInitialCommands(options): Command[]
  }

  class GameState {
    +gameId: string
    +players: Map
    +cards: Map
    +zones: Map
    +display: DisplayState
    +commandQueue: Command[]
    +commandLog: LogEntry[]
  }
}

package "Command Core" {
  class Command {
    +id: string
    +type: string
    +mode: CommandMode
    +status: CommandStatus
    +playerId: string?
    +params: object
  }

  enum CommandMode {
    immediate
    queued
    auto
    wait
  }

  enum CommandStatus {
    queued
    running
    waiting
    completed
    error
  }

  class CommandRegistry {
    +get(type): CommandModule
    +has(type): boolean
  }

  class CommandRunner {
    +runImmediate(state, command): GameState
    +enqueue(state, command): GameState
    +drainQueue(state): GameState
    -runCommand(state, command): GameState
  }

  class CommandModule {
    +type: string
    +create(params): Command
    +run(state, command): GameState
  }

  class CommandLog {
    +append(state, event): GameState
    +clear(state): GameState
  }

  class LogEntry {
    +sequence: number
    +time: string
    +eventType: string
    +commandType: string
    +actor: string
    +status: string
    +message: string
    +details: object?
  }
}

package "Card Core" {
  class Player {
    +id: string
    +name: string
  }

  class Card {
    +id: string
    +definitionId: string
    +name: string
    +cardType: string
    +imagePath: string
    +ownerId: string
    +zoneId: string
  }

  class Zone {
    +id: string
    +zoneType: string
    +label: string
    +capacity: number
    +cardIds: string[]
  }

  class CreatePlayerCommand
  class CreateZoneCommand
  class CreateCardCommand
  class AddCardToZoneCommand
  class MoveCardCommand
}

package "Display Core" {
  class DisplayState {
    +screen: Screen
    +zoom: ZoomPopup?
    +selectedCardId: string?
    +selectedTargetId: string?
  }

  class Screen {
    +type: string
  }

  class OneAreaScreen {
    +type = "ONE_AREA_SCREEN"
    +zoneIds: string[]
  }

  class BootScreen {
    +type = "BOOT_SCREEN"
  }

  class ZoomPopup {
    +type = "CARD_ZOOM_POPUP"
    +cardId: string
  }

  class OpenScreenCommand
  class OpenCardZoomCommand
  class CloseCardZoomCommand
  class ClearCommandLogCommand
}

package "pokemon-only-one Commands" {
  class InitPokemonGameCommand
}

RoomDocument --> GameState
RoomActionBridge --> Rules
Rules --> PokemonFactory
Rules --> CommandRunner
Rules --> CommandRegistry
PokemonFactory --> Command
GameState --> Player
GameState --> Card
GameState --> Zone
GameState --> DisplayState
GameState --> Command
GameState --> LogEntry

CommandRunner --> CommandRegistry
CommandRegistry --> CommandModule
CommandModule --> Command
CommandRunner --> CommandLog

Card <--> Zone : card.zoneId / zone.cardIds
DisplayState --> Screen
DisplayState --> ZoomPopup

CommandModule <|.. CreatePlayerCommand
CommandModule <|.. CreateZoneCommand
CommandModule <|.. CreateCardCommand
CommandModule <|.. AddCardToZoneCommand
CommandModule <|.. MoveCardCommand
CommandModule <|.. OpenScreenCommand
CommandModule <|.. OpenCardZoomCommand
CommandModule <|.. CloseCardZoomCommand
CommandModule <|.. ClearCommandLogCommand
CommandModule <|.. InitPokemonGameCommand

@enduml