# Five Parsecs Records Module

Folder name:

```text
src/games/five-parsecs/
```

Main component:

```jsx
import FiveParsecsGame from "./games/five-parsecs/FiveParsecsGame";
```

Expected props:

```jsx
<FiveParsecsGame
  roomId={roomId}
  playerId={playerId}
/>
```

It also tries to read these common alternatives:

```text
room.id
room.roomId
currentPlayer.id
currentPlayer.playerId
user.uid
```

Firestore path used:

```text
rooms/{roomId}/fiveParsecs/crew
rooms/{roomId}/fiveParsecs/{collectionName}/items/{recordId}
```

Collections:

```text
crewMembers
equipment
worlds
patrons
rivals
quests
rumors
encounters
encounterEnemies
enemyTemplates
logEntries
```

Important import assumption:

```js
import { db } from "../../firebase";
```

If your Firebase file is somewhere else, update `fiveParsecsFirestore.js`.

Game registry example:

```js
import FiveParsecsGame from "./games/five-parsecs/FiveParsecsGame";

{
  id: "five-parsecs",
  title: "Five Parsecs from Home",
  component: FiveParsecsGame
}
```
