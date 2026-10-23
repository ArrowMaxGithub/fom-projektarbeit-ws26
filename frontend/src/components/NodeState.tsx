export enum NodeState {
    Current,
    LegalDst,
    IllegalDst,
    GameOver,
}

export function nodeStateToClassName(state: NodeState): string {
    let result = "";
    switch (state) {
        case NodeState.Current:
            result = "CurrentNode";
            break;
        case NodeState.LegalDst:
            result = "LegalDstNode";
            break;
        case NodeState.IllegalDst:
            result = "IllegalDstNode";
            break;
        case NodeState.GameOver:
            result = "GameOver";
            break;
    }
    return result;
}