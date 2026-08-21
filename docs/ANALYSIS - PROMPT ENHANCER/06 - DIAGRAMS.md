# 06 - DIAGRAMS

[[00 - START HERE|Back to start]] · Previous: [[05 - SYSTEM ARCHITECTURE]] · Next: [[07 - DEVELOPMENT ROADMAP]]

Pictures of how this works. Each one has a plain-language reading beneath it, so nothing here depends on being able to read a diagram. All of them describe the proposed arrangement — nothing is built yet ([[05 - SYSTEM ARCHITECTURE]] says why).

## 1. The big picture

```mermaid
flowchart LR
    person["The person using it"]

    subgraph app["The pages people see"]
        pages["Six screens including Enhance"]
        editor["The editor with live preview"]
    end

    subgraph engine["The engine, in order"]
        parser["The parser"]
        classifier["The classifier"]
        rules["The rule engine"]
        resolver["The template resolver"]
        generator["The markdown generator"]
    end

    subgraph stores["Where things are kept"]
        prefs["The preference drawer"]
        content["The content store"]
    end

    person --> pages
    pages --> parser
    parser --> classifier
    classifier --> rules
    rules --> resolver
    resolver --> generator
    generator --> editor
    pages --> prefs
    editor --> content
```

**Reading this:** The person works only with the pages on the left. Pressing Enhance sends the wording into the engine, where five parts each do one job in a fixed order: recognise the pieces, name the type, choose the headings, fetch the task shape, write the final document. The finished text lands in the editor, where it can be polished and saved. Beneath everything, two stores: small preferences go to the preference drawer, and content — history, saved prompts, folders — goes to the content store. Nothing connects to the outside world. This matches the arrangement described in [[05 - SYSTEM ARCHITECTURE#How work would pass between them|How work would pass between them]] and the document's own drawing at `prompt-enhancer-detailed-context.md`, lines 1340–1385.

## 2. How a job gets done — enhancing a prompt

```mermaid
flowchart TD
    start(["Someone writes a prompt and presses Enhance"])
    checkEmpty{"Is anything written at all?"}
    askEmpty["Ask politely for a prompt"]
    parse["Pull out actions, limits, and technologies"]
    classify{"Is the tool confident about the type?"}
    settle["Mark it General and offer a manual pick"]
    useType["Use the detected type"]
    pickSections["Pick the sections that apply"]
    fetchShape["Fetch the matching task shape"]
    writeOut["Write the final markdown"]
    show["Show the result beside a live preview"]
    finish(["Finished"])

    start --> checkEmpty
    checkEmpty -->|"no"| askEmpty
    checkEmpty -->|"yes"| parse
    parse --> classify
    classify -->|"no"| settle
    classify -->|"yes"| useType
    settle --> pickSections
    useType --> pickSections
    pickSections --> fetchShape
    fetchShape --> writeOut
    writeOut --> show
    show --> finish
    askEmpty --> finish
```

**Reading this:** Two doors lead out of the confidence question. A confident classification goes straight through; a doubtful one settles on "General" and hands the person a picker so they can correct it — `prompt-enhancer-detailed-context.md`, lines 401–419. The empty-input door exists because the document requires a polite refusal rather than a broken run, lines 1033–1037. Every step after the fork is the pipeline the document calls its most important milestone, lines 1389–1405.

## 3. How a job gets done — bringing a backup in

```mermaid
flowchart TD
    start(["A backup file is chosen"])
    checkShape{"Does the file match the expected shape?"}
    checkVersion{"Is the version one this app reads?"}
    refuse["Refuse the file and say why"]
    preview["Show what would come in"]
    happy{"Is the person happy to continue?"}
    stop["Stop, change nothing"]
    bringIn["Bring the content in"]
    finish(["Finished"])

    start --> checkShape
    checkShape -->|"no"| refuse
    checkShape -->|"yes"| checkVersion
    checkVersion -->|"no"| refuse
    checkVersion -->|"yes"| preview
    preview --> happy
    happy -->|"no"| stop
    happy -->|"yes"| bringIn
    bringIn --> finish
    refuse --> finish
    stop --> finish
```

**Reading this:** The file has to pass two gates before anything happens — shape first, then version number. Failing either refuses the file outright. Passing both shows a preview and waits for a yes; walking away at that point changes nothing. This is the five-step import gate required at `prompt-enhancer-detailed-context.md`, lines 938–947.

## 4. Who talks to whom, in order — one enhancement, saved

```mermaid
sequenceDiagram
    participant Person as The person
    participant Pages as The pages people see
    participant Engine as The engine
    participant Store as The content store

    Person->>Pages: Types a prompt and presses Enhance
    Pages->>Engine: Hands over the wording and the chosen settings
    Engine->>Engine: Works out type, sections, and structure
    Engine-->>Pages: Returns the finished markdown
    Pages-->>Person: Shows the result with a live preview
    Person->>Pages: Presses Save
    Pages->>Store: Writes the prompt away
    Store-->>Pages: Confirms it is kept
    Pages-->>Person: Shows it in the library
```

**Reading this:** Time runs downwards. Solid arrows are requests going out; dashed arrows are answers coming back. The engine never speaks to the person directly — everything passes through the pages. The save at the bottom only happens on purpose; the automatic kind, history, skips the asking and writes as soon as an enhancement finishes, when the switch is on (`prompt-enhancer-detailed-context.md`, lines 838–853). Note what is absent from the picture: no arrow ever leaves these four participants. Nothing is sent anywhere.

## 5. The order of the phases

```mermaid
flowchart LR
    p1["Phase 1 - Foundations and the shape of the data"]
    p2["Phase 2 - Understanding what was asked"]
    p3["Phase 3 - Turning understanding into structure"]
    p4["Phase 4 - The workspace people use"]
    p5["Phase 5 - Giving the app a memory"]
    p6["Phase 6 - Control, trust, and every screen size"]
    p7["Phase 7 - Proving it works and shipping it"]

    p1 --> p2
    p2 --> p3
    p3 --> p4
    p4 --> p5
    p5 --> p6
    p6 --> p7
```

**Reading this:** Phase 1 starts; everything else waits for the phase behind it. An arrow means the phase it points at cannot begin until the one before it is done — the workspace has nothing to show until the pipeline exists, and there is nothing to remember until the workspace produces results. The order matches [[07 - DEVELOPMENT ROADMAP]] exactly, which in turn follows the document's own recommended sequence at `prompt-enhancer-detailed-context.md`, lines 1269–1313.

## 6. The life story of a prompt

```mermaid
stateDiagram-v2
    [*] --> Typed
    Typed --> Understood : the type is detected or a preset chose it
    Understood --> Enhanced : Enhance is pressed
    Enhanced --> Polished : the result is edited
    Enhanced --> InHistory : kept automatically when history is on
    Polished --> InLibrary : Save is pressed
    InHistory --> InLibrary : Save to Library is pressed
    InLibrary --> [*] : deleted
    InHistory --> [*] : deleted
```

**Reading this:** A prompt is born typed. Understanding it — automatically or by preset — unlocks the enhancement. From there it can sit in history without any effort, or be polished and saved to the library on purpose. History can still be promoted to the library later. The two ends of the line are deletions; there is no way back from those. Favourites, folders, and tags are labels worn inside the library rather than stops on this journey — the document treats them as attributes of a saved prompt, lines 888–899.
