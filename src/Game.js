import './Game.css';
import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { ItemInfo, ConfirmModal, InfoModal, Modal, SettingsButton, PlayerAvatar } from './Control.jsx';

import {
  Sword, Shield, Bow, InfectPotion, TimeBomb, XFlower
  , FreezeSpell
} from './Item.ts'
import {
  GameMode, Piece_Type_Black, Piece_Type_White, DeviceType, root, _,
  GlobalSignal,
} from './ConstDefine.jsx';

// 样式
const Init_Square_Style = 'square';
const Square_Bomb_Style = 'square-bomb';
const Square_Current_Piece_Style = 'square-current-piece';
const Square_Growth_Black_Style = 'square-growth-black';
const Square_Growth_White_Style = 'square-growth-white';
const Square_Frozen = 'square-frozen';
const Piece_Winner_Style = 'piece-winner';

const Piece_Black_With_Sword = 'piece-black-with-sword';
const Piece_Black_With_Bow = 'piece-black-with-bow';
const Piece_Black_With_InfectPotion = 'piece-black-with-infectPotion';
const Piece_White_With_Sword = 'piece-white-with-sword';
const Piece_White_With_Bow = 'piece-white-with-bow';
const Piece_White_With_InfectPotion = 'piece-white-with-infectPotion';

// 音效
const Error_Target = 'error-target.mp3';
const Win = 'win.mp3';
const Failure = 'failure.mp3';
const Place_Piece = 'place-piece.mp3';
const Move_Piece = 'move-piece.wav';
const Sword_Defeat_Normal = 'sword-defeat-normal.wav';
const Sword_Defeat_Shield = 'sword-defeat-shield.mp3';
const Sword_Defeat_Flower = 'sword-defeat-flower.mp3';
const Sword_No_Effect = 'sword-no-effect.mp3';
const Take_Shield = 'take-shield.wav';
const Bow_Melee_Failed_Shield = 'bow-melee-failed-shield.mp3';
const Bow_Melee_Defeat_Normal = 'bow-melee-defeat-normal.mp3';
const Bow_Melee_Defeat_Flower = 'bow-melee-defeat-flower.mp3';
const Bow_Melee_No_Effect = 'bow-melee-no-effect.mp3';
const Bow_Ranged_Failed_Shield = 'bow-ranged-failed-shield.mp3';
const Bow_Ranged_Defeat_Normal = 'bow-ranged-defeat-normal.wav';
const Bow_Ranged_Defeat_Flower = 'bow-ranged-defeat-flower.mp3';
const Bow_Ranged_No_Effect = 'bow-ranged-no-effect.mp3';

const Infect_Normal = 'infect-normal.mp3';
const Infect_Flower = 'infect-flower.mp3';
const Infect_No_Effect = 'infect-no-effect.mp3';
const Infect_Failed_Shield = 'infect-failed-shield.mp3';

const Bomb_Attach = 'bomb-attach.mp3';
const Bomb_Bomb = 'bomb-bomb.mp3';
const Flower_Place = 'flower-place.mp3';
const Flower_Full_Grown = 'flower-full-grown.mp3';

// 按钮
const SOUND = '音效';
const BGM = '背景音乐';
const VOLUME = '音量';
const OPEN = '开启';
const CLOSE = '关闭';
const RESTART_GAME = '再来';
const OPEN_SOUND = OPEN + SOUND;
const CLOSE_SOUND = CLOSE + SOUND;
const OPEN_BGM = OPEN + BGM;
const CLOSE_BGM = CLOSE + BGM;
const MAX_VOLUME = 100;
const MIN_VOLUME = 0;
const VOLUME_PER_TIME = 10;

let _isMute = false;
let _volume = 100;

let Board_Width;
let Board_Height;

// 状态
const Item = {
  NONE: 0,
  SWORD: 1,
  SHIELD: 2,
  BOW: 3,
  INFECT_POTION: 4,
  BOMB: 5,
  XFLOWER: 6,
  FREEZE_SPELL: 7,
}
const InitPieceStatus = {
  bombCount: 0,
  withItem: Item.NONE,
  frozen: false,//冻结
  frozenTime: 0,//总冻结时常
  attachSeed: false,//是否种子
  growthTime: 0,//生成所需时间
  attachBomb: false,//是否绑定炸弹
  liveTime: 0,//自爆需要时间
}

let checkArray = [];// 判定胜利棋子数组

export class Piece {
  constructor(type = '', willBe = '', canBeDestroyed = true, canBeInfected = true, liveTime = -1, growthTime = -1, x = -1, y = -1, status) {
    this.type = type;
    this.willBe = willBe;
    this.canBeDestroyed = canBeDestroyed;
    this.canBeInfected = canBeInfected;
    this.style = 'piece-blank';
    this.liveTime = liveTime;
    this.growthTime = growthTime;
    this.x = x;
    this.y = y;
    this.squareStyle = Init_Square_Style;
    this.status = { ...status };
    this.setSquareStyle();
    this.setStyle();

  }

  setType(type) {
    this.type = type;
    this.canBeDestroyed = true;
    this.canBeInfected = true;
    this.setStyle();
  }

  getPieceColor() {
    if (this.type === '●') {
      return '#000000';
    }
    else if (this.type === '○') {
      return '#ffffff';
    }
    else {
      return '#000000,transparent';
    }
  }

  setWinnerPiece() {
    this.setStyle(Piece_Winner_Style);
    root.style.setProperty('--piece-winner-color', this.getPieceColor());
  }

  setWillBe(type) {
    this.willBe = type;
    this.canBeDestroyed = true;
  }

  setLiveTime(item) {
    if (this.liveTime > 0) {
      this.status.bombCount += 1;
    }
    this.liveTime = item.liveTime;
  }

  setGrowthTime(item, type, growthTime) {
    if (item === null) {
      this.growthTime = growthTime;
      this.setWillBe(type);
      this.setSquareStyle(null, Init_Square_Style);
    }
    else {
      this.growthTime = item.growthTime;
      if (this.growthTime > 0) {
        this.setWillBe(type);
        this.setSquareStyle(item, '');
      }
    }
  }

  setCanBeDestroyed(canBeDestroyed) {
    this.canBeDestroyed = canBeDestroyed;
    this.setStyle();
  }

  setCanBeInfected(canBeInfected) {
    this.canBeInfected = canBeInfected;
    this.setStyle();
  }

  setStyle(style) {
    if (style) {
      this.style = style;
    }
    else if (this.status.attachBomb) {
      this.style = 'piece-bomb';
    }
    else if (this.type === '●') {
      if (!this.canBeDestroyed) {
        if (this.status.frozen) {
          this.style = 'piece-black-can-not-be-destroyed-frozen';
        }
        else {
          this.style = 'piece-black-can-not-be-destroyed';
        }
      }
      else {
        if (this.status.frozen) {
          this.style = 'piece-black-frozen';
        }
        else {
          switch (this.status.withItem) {
            case Item.SWORD: {
              this.style = Piece_Black_With_Sword;
              break;
            }
            case Item.BOW: {
              this.style = Piece_Black_With_Bow;
              break;
            } case Item.INFECT_POTION: {
              this.style = Piece_Black_With_InfectPotion;
              break;
            }
            default: {
              this.style = 'piece-black';
              break;
            }
          }
        }
      }
    }
    else if (this.type === '○') {
      if (!this.canBeDestroyed) {
        if (this.status.frozen) {
          this.style = 'piece-white-can-not-be-destroyed-frozen';
        }
        else {
          this.style = 'piece-white-can-not-be-destroyed';
        }
      }
      else {
        if (this.status.frozen) {
          this.style = 'piece-white-frozen';
        }
        else {
          switch (this.status.withItem) {
            case Item.SWORD: {
              this.style = Piece_White_With_Sword;
              break;
            }
            case Item.BOW: {
              this.style = Piece_White_With_Bow;
              break;
            } case Item.INFECT_POTION: {
              this.style = Piece_White_With_InfectPotion;
              break;
            }
            default: {
              this.style = 'piece-white';
              break;
            }
          }
        }
      }
    }
    else {
      this.style = 'piece-blank';
    }
  }

  setSquareStyle(item, squareStyle) {
    if (item === undefined && squareStyle === undefined) {
      if (this.liveTime > 0) {
        this.squareStyle = Square_Bomb_Style;
      }
      else if (this.status.frozen) {
        this.squareStyle = Square_Frozen;
      }
      else if (this.growthTime > 0) {
        if (this.willBe === '●') {
          this.squareStyle = Square_Growth_Black_Style;
        }
        else if (this.willBe === '○') {
          this.squareStyle = Square_Growth_White_Style;
        }
      }
      else if (this.growthTime === 0) {
        this.squareStyle = Init_Square_Style;
      }
      else {
        this.squareStyle = Init_Square_Style;
      }
      return;
    }
    if (item === undefined && squareStyle !== '') {
      this.squareStyle = squareStyle;
      return;
    }
    if (item === null && squareStyle !== '') {
      this.squareStyle = squareStyle;
      return;
    }
    if (this.type !== '') { //后处理走这里
      // this.squareStyle = Square_Current_Piece_Style; 使用棋子阴影表示道具使用状态
      if (!this.canBeDestroyed && item instanceof Bow) { // 攻击失败
        this.squareStyle = Init_Square_Style;
      }
    }
    else if (item !== null && item.isUsed) {
      this.squareStyle = Init_Square_Style;
      if (this.growthTime > 0) {
        if (this.willBe === '●') {
          this.squareStyle = Square_Growth_Black_Style;
        }
        else if (this.willBe === '○') {
          this.squareStyle = Square_Growth_White_Style;
        }
      }
    }
    else if (this.liveTime > 0) {
      this.squareStyle = Square_Bomb_Style;
    }
    else if (this.growthTime > 0) {
      if (!this.status.frozen) {
        if (this.willBe === '●') {
          this.squareStyle = Square_Growth_Black_Style;
        }
        else if (this.willBe === '○') {
          this.squareStyle = Square_Growth_White_Style;
        }
      }
    }
  }
  useItem(item, board) {
    if (item.isUsed) {
      return;
    }
    if (item.name === 'shield') {
      this.setCanBeDestroyed(false);
      this.setCanBeInfected(false);
    } else if (item.name === 'timeBomb') {
      this.attachBomb(item, board);
    } else if (item.name === 'xFlower') {
      this.attachSeed(item, board);
    }
    else if (item instanceof FreezeSpell) {
      this.useFreezeSpell(item, board);
    }
    item.isUsed = true;
  }

  useFreezeSpell(item, board) {
    const validPos = this.getValidPosition(item);
    for (const arr of validPos) {
      const tr = arr[0];
      const tc = arr[1];
      board[tr][tc].status.frozen = true;
      board[tr][tc].setSquareStyle();
      board[tr][tc].setStyle();
    }
  }

  getValidPosition(item) {
    const atkRange = item.attackRange;
    if (item.attackRange > 0) {
      let validPos = [];
      const r = this.x;
      const c = this.y;
      if (atkRange <= 1) {
        const arrayToCheck = [[r, c], [r, c + 1], [r, c - 1], [r + 1, c], [r - 1, c]];
        for (const arr of arrayToCheck) {
          const tr = arr[0];
          const tc = arr[1];
          if (tr >= 0 && tr < Board_Height && tc >= 0 && tc < Board_Width) {
            validPos.push([tr, tc]);
          }
        }
      }
      else if (atkRange <= 1.5) {
        const arrayToCheck = [[r, c], [r, c + 1], [r, c - 1], [r + 1, c], [r - 1, c], [r - 1, c - 1], [r - 1, c + 1], [r + 1, c - 1], [r + 1, c + 1]];
        for (const arr of arrayToCheck) {
          let tr = arr[0];
          let tc = arr[1];
          if (tr >= 0 && tr < Board_Height && tc >= 0 && tc < Board_Width) {
            validPos.push([tr, tc]);
          }
        }
      }
      return validPos;
    }
  }

  handleSound(item, currPiece = null) {
    // 音效
    if (item instanceof Sword) {
      if (this.type === '') {
        playSound(Sword_No_Effect);
      }
      else if (this.growthTime > 0) {
        playSound(Sword_Defeat_Flower);
      }
      else if (this.canBeDestroyed) {
        playSound(Sword_Defeat_Normal);
      }
      else {
        playSound(Sword_Defeat_Shield);
      }
    }
    else if (item instanceof Bow) {
      if (!currPiece) {
        return;
      }
      const r = currPiece.x;
      const c = currPiece.y;
      const dist = Math.sqrt(Math.pow(this.x - r, 2) + Math.pow(this.y - c, 2));
      if (this.type === '') {
        if (dist <= 1) {
          playSound(Bow_Melee_No_Effect);
        } else {
          playSound(Bow_Ranged_No_Effect);
        }
      }
      else if (this.growthTime > 0) {
        if (dist <= 1) {
          playSound(Bow_Melee_Defeat_Flower);
        } else {
          playSound(Bow_Ranged_Defeat_Flower);
        }
      }
      else if (this.canBeDestroyed) {
        if (dist <= 1) {
          playSound(Bow_Melee_Defeat_Normal);
        } else {
          playSound(Bow_Ranged_Defeat_Normal);
        }
      }
      else {
        if (dist <= 1) {
          playSound(Bow_Melee_Failed_Shield);
        } else {
          playSound(Bow_Ranged_Failed_Shield);
        }
      }
    }
    else if (item instanceof InfectPotion) {
      if (this.type === '') {
        playSound(Infect_No_Effect);
      }
      else if (!this.canBeDestroyed) {
        playSound(Infect_Failed_Shield);
      }
      else if (this.growthTime > 0) {
        playSound(Infect_Flower);
      }
      else {
        playSound(Infect_Normal);
      }
    }
    else if (item instanceof TimeBomb) {
      playSound(Bomb_Attach);
    }
    else if (item instanceof XFlower) {
      playSound(Flower_Place);
    }
  }

  destroy(item, board, piece = null, byBomb) {
    this.handleSound(item, piece);
    if (board === null) {
      return;
    }
    if (item) {
      item.isUsed = true;
    }
    if (byBomb) {
      if (this.status.frozen) {
        this.status.frozen = false;
        this.status.frozenTime = 0;
        this.setSquareStyle();
        this.setStyle();
      }
      if (this.growthTime > 0) {
        if (this.status.frozen) {
          this.status.frozen = false;
        }
        if (this.status.attachSeed) {
          this.status.attachSeed = false;
          this.status.growthTime = 0;
          const r = this.x;
          const c = this.y;
          const arrayToCheck = [[r, c], [r - 1, c - 1], [r + 1, c + 1], [r + 1, c - 1], [r - 1, c + 1]];
          for (const arr of arrayToCheck) {
            const tr = arr[0];
            const tc = arr[1];
            if (tr >= 0 && tr < Board_Height && tc >= 0 && tc < Board_Width) {
              if (board[tr][tc].growthTime > 0) {
                board[tr][tc].setGrowthTime(null, '', -1);
              }
              this.setType('');
            }
          }
        }
        else {
          this.setType('');
        }
      }
      else { // 攻击普通单位
        this.setType('');
      }
    }
    else {
      if (this.status.frozen) {
        this.status.frozen = false;
        this.status.frozenTime = 0;
        this.setSquareStyle();
        this.setStyle();
        return;
      }
      // 攻击花朵
      if (this.growthTime > 0) {
        if (this.status.attachSeed) {
          this.status.attachSeed = false;
          this.status.growthTime = 0;
          const r = this.x;
          const c = this.y;
          const arrayToCheck = [[r, c], [r - 1, c - 1], [r + 1, c + 1], [r + 1, c - 1], [r - 1, c + 1]];
          for (const arr of arrayToCheck) {
            const tr = arr[0];
            const tc = arr[1];
            if (tr >= 0 && tr < Board_Height && tc >= 0 && tc < Board_Width) {
              if (board[tr][tc].growthTime > 0) {
                board[tr][tc].setGrowthTime(null, '', -1);
              }
            }
          }
          this.setType('');
        }
        else {
          if (this.type !== '') {
            if (this.canBeDestroyed || item instanceof Sword) {
              this.setType('');
            }
          }
        }
      }
      else { //攻击普通单位
        if (this.type !== '') {
          if (this.canBeDestroyed || item instanceof Sword) {
            this.setType('');
          }
        }
      }
    }

    this.setSquareStyle();
    this.setStyle();
  }


  infect(item, piece, board) {
    this.handleSound(item, piece);
    if (this.status.frozen) {
      item.isUsed = true;
      return;
    }
    else {
      if (this.type === '') {
        item.isUsed = true;
        return;
      }
    }
    // 侵蚀花朵
    if (this.growthTime > 0) {
      if (this.status.attachSeed) {
        this.status.attachSeed = false;
        this.status.growthTime = 0;
        const r = this.x;
        const c = this.y;
        const arrayToCheck = [[r, c], [r - 1, c - 1], [r + 1, c + 1], [r + 1, c - 1], [r - 1, c + 1]];
        for (const arr of arrayToCheck) {
          const tr = arr[0];
          const tc = arr[1];
          if (tr >= 0 && tr < Board_Height && tc >= 0 && tc < Board_Width) {
            if (board[tr][tc].growthTime > 0) {
              board[tr][tc].setGrowthTime(null, '', -1);
            }
          }
        }
        if (this.canBeInfected) {
          this.setType(piece.type);
        }
      }
      else {
        if (this.canBeInfected) {
          this.setType(piece.type);
        }
      }
    }
    else { //攻击普通单位
      if (this.canBeInfected) {
        this.setType(piece.type);
      }
    }
    this.setSquareStyle();
    this.setStyle();
    item.isUsed = true;
  }

  attachBomb(item, board) {
    this.handleSound(item);
    const r = this.x;
    const c = this.y;
    const arrayToCheck = [[r, c], [r, c + 1], [r, c - 1], [r + 1, c], [r - 1, c]];
    for (const arr of arrayToCheck) {
      const tr = arr[0];
      const tc = arr[1];
      if (tr >= 0 && tr < Board_Height && tc >= 0 && tc < Board_Width) {
        if (board[tr][tc].liveTime < 0) {
          board[tr][tc].setLiveTime(item);
        } else if (board[tr][tc].liveTime < item.liveTime) {
          board[tr][tc].setLiveTime(item);
        }
        board[tr][tc].setSquareStyle();
      }
    }
    item.isUsed = true;
    this.status.attachBomb = true;
    this.setSquareStyle();
    this.setStyle();
  }

  bomb(item, board, byBomb) {
    if (this.status.bombCount === 0) {
      this.liveTime = -1;
    }
    if (this.status.bombCount > 0) {
      this.status.bombCount -= 1;
    }
    this.destroy(item, board, null, byBomb);
    if (this.status.attachBomb) {
      this.status.attachBomb = false;
    }
    this.setSquareStyle();
    this.setStyle();
  }

  attachSeed(item, board) {
    this.handleSound(item);
    if (this.status.frozen) {
      item.isUsed = true;
      this.status.attachSeed = true;
      this.setStyle();
      return;
    }
    const r = this.x;
    const c = this.y;
    const arrayToCheck = [[r, c], [r - 1, c - 1], [r + 1, c + 1], [r + 1, c - 1], [r - 1, c + 1]];
    for (const arr of arrayToCheck) {
      const tr = arr[0];
      const tc = arr[1];
      if (tr >= 0 && tr < Board_Height && tc >= 0 && tc < Board_Width) {
        // 冰冻不能生长
        if (board[tr][tc].status.frozen) {
          continue;
        }
        if (board[tr][tc].growthTime < 0) {
          board[tr][tc].setGrowthTime(item, this.type);
        } else if (board[tr][tc].growthTime < item.growthTime) {
          board[tr][tc].setGrowthTime(item, this.type);
        }
      }
    }
    item.isUsed = true;
    this.status.attachSeed = true;
    this.status.growthTime = item.growthTime;
    this.setStyle();
  }

  grow(item) {
    let grown = false;
    if (this.growthTime > 0) {
      this.setSquareStyle();
    }
    else if (this.growthTime === 0) {
      grown = true;
      if (this.status.attachSeed) {
        this.attachSeed = false;
      }
      this.growthTime = -1;
      if (this.status.frozen) {
        return grown;
      }
      if (this.type === '') {
        this.setType(this.willBe);
        checkArray.push([this.x, this.y]);
      }
      this.setSquareStyle();
    }
    return grown;
  }

  beforeUse(item) {
    if (this.type !== '') {
      item.beforeUse();
      if (item instanceof Sword) {
        this.status.withItem = Item.SWORD;
      }
      else if (item instanceof Bow) {
        this.status.withItem = Item.BOW;
      }
      else if (item instanceof InfectPotion) {
        this.status.withItem = Item.INFECT_POTION;
      }
      this.setStyle();
    }
  }
}

function Square({ piece, onSquareClick, squareStyle, playSound }) {
  const playMovePieceSound = () => {
    if (piece.type !== '' || _isMute) {
      return;
    }
    const sound = new Howl({
      src: ['audio/' + Move_Piece],
      volume: _volume / 100,
    });
    sound.play();
  };
  return (
    <button className={piece.squareStyle} onClick={onSquareClick} onMouseEnter={playMovePieceSound}>
      <span className={piece.style}></span>
    </button>
  );

}

function deepCloneBoard(board) {
  return board.map(row => row.map(piece => (piece instanceof Piece ? deepClonePiece(piece) : piece)));
}

function deepClonePiece(piece) {
  const clonedPiece = new Piece(piece.type, piece.willBe, piece.canBeDestroyed, piece.canBeInfected, piece.liveTime, piece.growthTime, piece.x, piece.y, piece.status);
  return clonedPiece;
}

function Board({ xIsNext, board, setBoard, currentMove, onPlay, gameOver,
  setGameOver, selectedItem, nextSelItem, selectedItemHistory, gameStart, setGameStart,
  openModal, playSound, UndoButton, RedoButton, RestartButton, SwitchSoundButton,
  VolumeControlButton, logAction, isRestart, lastClick, setLastClick,
  socket, pieceType, lastStep, gameMode, skipRound, isSkipRound,
  ExitButton, SkipButton, avatarIndex, avatarIndexPB, setChatPanelOpen,
  completelyReady }) {

  const [squareStyle, setSquareStyle] = useState(Init_Square_Style);
  const [pieceClicked, setPieceClicked] = useState(false); // 落子但未使用道具
  const [nextAIStep, setNextAIStep] = useState();
  const [waitAnotherReadyModalOpen, setWaitAnotherReadyModalOpen] = useState(false);

  useEffect(() => {
    if ([GameMode.MODE_ROOM, GameMode.MODE_MATCH].includes(gameMode)) {
      socket.emit('completelyReady');
    }
  }, []);

  const renderCell = (cellValue, rowIndex, colIndex) => {
    const key = [rowIndex, colIndex];
    const result = (
      <Square key={key}
        piece={cellValue} onSquareClick={() => handleClick(rowIndex, colIndex)}
        squareStyle={squareStyle} playSound={playSound} />
    );
    return result;
  };

  function isMyTurn() {
    return ((pieceType === Piece_Type_Black && xIsNext) || (pieceType === Piece_Type_White && !xIsNext));
  }

  function checkWinner(nextBoard, i, j) {
    if (i === undefined || j === undefined) {
      if (_.isEqual(lastClick, [null, null])) {
        return;
      }
      i = lastClick[0];
      j = lastClick[1];
    }
    // 胜利判定
    checkArray.push([i, j]);
    for (const arr of checkArray) {
      const winnerInfo = calculateWinner(nextBoard, arr[1], arr[0], selectedItem);
      if (winnerInfo[0]) {
        let pieceNumStatus = '';
        if (winnerInfo.length === 3) {
          pieceNumStatus = Piece_Type_Black + ': ' + winnerInfo[2][0] + '，' + Piece_Type_White + ': ' + winnerInfo[2][1] + '，';
        }
        openModal(pieceNumStatus + winnerInfo[0] + '胜利！', 60000);
        setGameOver(true);
        logAction(nextBoard[i][j], nextBoard[i][j], selectedItem, true);
        if (winnerInfo[1]) {
          for (const arr of winnerInfo[1]) {
            if (arr === null) {
              break;
            }
            const x = arr[0];
            const y = arr[1];
            nextBoard[x][y].setWinnerPiece();
          }
        }
        playSound(Win);
        break;
      }
    }
    checkArray = [];
  }

  function handleClick(i, j, isEnemyTurn) {
    if (gameOver) {
      if (gameMode === GameMode.MODE_AI) {
        return;
      }
      openModal("游戏已结束！再来一局吧", 3000);
      return;
    }

    if (gameMode !== GameMode.MODE_SIGNAL && gameMode !== GameMode.MODE_AI) {
      if (isEnemyTurn) {

      }
      else {
        if ((pieceType === Piece_Type_Black && !xIsNext) ||
          (pieceType === Piece_Type_White && xIsNext)) {
          playSound(Error_Target);
          return;
        }
      }
    }

    // 预处理
    if (gameStart) {
      setGameStart(false);
    }

    if (board[i][j].type !== '') {
      if (!selectedItem.before) {
        playSound(Error_Target);
        return;
      }
    }
    else {
      switch (selectedItem.name) {
        case 'shield': {
          if (board[i][j].type !== '') {
            return;
          }
          break;
        }
        case 'sword':
        case 'bow': {
          break;
        }
        case 'infectPotion': {
          break;
        }
        case 'timeBomb': {
          break;
        }
        default: {
          break;
        }
      }
    }
    // const nextBoard = board.slice();
    // const nextBoard = JSON.parse(JSON.stringify(board));
    const nextBoard = deepCloneBoard(board);
    if (selectedItem.name === 'timeBomb') {
      if (board[i][j].liveTime > 0) {
        // openModal('不能在此放置炸弹！');
        playSound(Error_Target);
        return;
      }
      if (xIsNext) {
        nextBoard[i][j].setType('●');
      } else {
        nextBoard[i][j].setType('○');
      }
    } else {
      if (!selectedItem.before) {
        if (xIsNext) {
          nextBoard[i][j].setType('●');
        } else {
          nextBoard[i][j].setType('○');
        }
      }
    }

    onPlay(lastClick, setLastClick, nextBoard, i, j);

    if (gameMode === GameMode.MODE_AI && selectedItem.before && !xIsNext) {
      setPieceClicked(true);
    }

    checkWinner(nextBoard, i, j);

    // 发送消息
    if (!isEnemyTurn && gameMode !== GameMode.MODE_SIGNAL && gameMode !== GameMode.MODE_AI) {
      const currItem = selectedItem.name;
      const nextItem = nextSelItem.name;
      socket.emit('step', { i, j, currItem, nextItem });
    }
  }

  useEffect(() => {
    if (lastStep.length === 0) {
      return;
    }
    handleClick(lastStep[0], lastStep[1], true);
  }, [lastStep]);

  useEffect(() => {
    if (gameMode === GameMode.MODE_AI && !xIsNext) {
      const nextAIStep = calculateNextStep(board, selectedItem);
      setNextAIStep(nextAIStep);
      setTimeout(() => {
        handleClick(nextAIStep[0][0], nextAIStep[0][1]);
      }, Math.random() * 1000 + 1000);
    }
  }, [xIsNext]);

  useEffect(() => {
    if (pieceClicked) {
      setTimeout(() => {
        if (_.isEqual(nextAIStep[1], [null, null])) {
          skipRound();
        }
        else if (nextAIStep[1]) {
          handleClick(nextAIStep[1][0], nextAIStep[1][1]);
        }
      }, 800);
      setPieceClicked(false);
    }
  }, [pieceClicked, nextAIStep]);

  useEffect(() => {
    if (isSkipRound) {
      skipRound();
      //
      checkWinner(board);
    }
  }, [isSkipRound]);

  let currentPiece = xIsNext ? '●' : '○';
  let nextPiece = xIsNext ? '○' : '●';
  // let currentItem = selectedItemHistory[currentMove];
  let currentItem = selectedItem;

  let nextPieceStatus = '下个棋子: ';
  let currentPieceStatus = '当前棋子: ';
  // let isUsedStatus = currentItem.isUsed ? '已使用' : '未使用';
  // if (currentItem.isUsed) {
  //   root.style.setProperty('--item-used-status-span-color', 'red');
  // }
  // else {
  //   root.style.setProperty('--item-used-status-span-color', 'green');
  // }

  // if (currentItem.isUsed) {
  //   root.style.setProperty('--item-used-status-span-color', 'red');
  // }
  // else {
  //   root.style.setProperty('--item-used-status-span-color', 'green');
  // }
  let currentItemStatus = '当前道具: ';
  let nextItemStatus = '下个道具: ';
  let myTurn;
  if (gameMode === GameMode.MODE_SIGNAL || gameMode === GameMode.MODE_AI) {
    myTurn = xIsNext;
  }
  else {
    myTurn = isMyTurn();
  }

  const anotherPieceType = pieceType === Piece_Type_Black ? Piece_Type_White : Piece_Type_Black;
  return (
    <>
      <div className='game-info-parent'>
        <PlayerAvatar avatarIndex={avatarIndex} isMyTurn={myTurn}
          pieceType={(gameMode === GameMode.MODE_SIGNAL || gameMode === GameMode.MODE_AI) ? Piece_Type_Black : pieceType} />
        <div className='game-info'>
          <div className="piece-status">{currentPieceStatus}<span className='piece-name'>{currentPiece}</span><span className='span-blank'></span>
            {currentItemStatus}<ItemInfo item={selectedItem} />
          </div>
          <div className="piece-status">{nextPieceStatus}<span className='piece-name'>{nextPiece}</span><span className='span-blank'></span>
            {nextItemStatus}<ItemInfo item={nextSelItem} /></div>
          <div className="button-container">
            <UndoButton />
            <RedoButton />
            <SkipButton />
            <RestartButton />
            <SettingsButton SwitchSoundButton={SwitchSoundButton} VolumeControlButton={VolumeControlButton} isRestart={isRestart} />
            <ExitButton />
          </div>
        </div>
        <PlayerAvatar setChatPanelOpen={(gameMode === GameMode.MODE_SIGNAL || gameMode === GameMode.MODE_AI) ? undefined : setChatPanelOpen} avatarIndex={avatarIndexPB}
          isMyTurn={!myTurn}
          pieceType={(gameMode === GameMode.MODE_SIGNAL || gameMode === GameMode.MODE_AI) ? Piece_Type_White : anotherPieceType} />
      </div>
      <div className="board-row">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="board-row">
            {row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))}
          </div>
        ))}
      </div>
      {!completelyReady && (gameMode === GameMode.MODE_MATCH || gameMode === GameMode.MODE_ROOM) &&
        < Modal modalInfo='对方正在加载，请耐心等待...' setModalOpen={setWaitAnotherReadyModalOpen} />
      }
    </>
  );
}

// 创建棋盘
function createBoard(width, height, setGameStart) {
  const board = [];
  for (let i = 0; i < height; i++) {
    const row = [];
    for (let j = 0; j < width; j++) {
      const piece = new Piece('', '', true, true, -1, -1, i, j, InitPieceStatus);
      row.push(piece);
    }
    board.push(row);
  }
  setGameStart(true);
  return board;
}

function playSound(audioName) {
  if (_isMute) {
    return;
  }
  let audioSrc = audioName ? '/audio/' + audioName : null;
  if (!audioSrc) {
    return;
  }
  const sound = new Howl({
    src: [audioSrc],
    volume: _volume / 100,
  });
  sound.play();
};

/**
 * 是否存在可被选中的棋子
 */
function haveValidPiece(item, lastClick, i, j, board, statusObj) {
  let result = false;
  if (item.isUsed) {
    return false;
  }
  if (!(item instanceof FreezeSpell) && board[i][j].status.frozen) {
    if (item instanceof TimeBomb) {
      result = true;
    }
    else if (item instanceof XFlower) {
      result = true;
    }
    else {
      statusObj.pieceStatus = board[i][j].status;
    }
    return result;
  }
  if (item.name === 'sword') {
    const arrayToCheck = [[i, j + 1], [i, j - 1], [i + 1, j], [i - 1, j]];
    for (const arr of arrayToCheck) {
      let x = arr[0];
      let y = arr[1];
      if (x >= 0 && x < Board_Height && y >= 0 && y < Board_Width && board[x][y].liveTime < 0) {
        if (board[x][y].status.frozen) {
          result = true;
          break;
        }
        else if (board[x][y].type !== board[i][j].type && board[x][y].type !== '') {
          result = true;
          break;
        }
      }
    }
  }
  else if (item.name === 'bow') {
    const arrayToCheck = [[i, j + 1], [i, j - 1], [i + 1, j], [i - 1, j], [i - 1, j - 1], [i - 1, j + 1], [i + 1, j - 1], [i + 1, j + 1]];
    for (const arr of arrayToCheck) {
      let x = arr[0];
      let y = arr[1];
      if (x >= 0 && x < Board_Height && y >= 0 && y < Board_Width && board[x][y].liveTime < 0) {
        if (board[x][y].status.frozen) {
          result = true;
          break;
        }
        else if (board[x][y].type !== board[i][j].type && board[x][y].type !== '' && board[x][y].canBeDestroyed) {
          result = true;
          break;
        }
      }
    }
  }
  else if (item.name === 'shield') {
    result = true;
  }
  else if (item.name === 'infectPotion') {
    const arrayToCheck = [[i, j + 1], [i, j - 1], [i + 1, j], [i - 1, j]];
    for (const arr of arrayToCheck) {
      let x = arr[0];
      let y = arr[1];
      if (x >= 0 && x < Board_Height && y >= 0 && y < Board_Width && board[x][y].liveTime < 0) {
        if (board[x][y].status.frozen) {
          continue;
        }
        if (board[x][y].type !== board[i][j].type && board[x][y].type !== '' && board[x][y].canBeInfected) {
          result = true;
          break;
        }
      }
    }
  }
  else if (item.name === 'timeBomb') {
    result = true;
  }
  else if (item.name === 'xFlower') {
    result = true;
  }
  else if (item instanceof FreezeSpell) {
    result = true;
  }
  return result;
}

function validateLoc(item, lastClick, i, j, board, openModal, closeModal) {
  let isRangeValid = false;
  let isObjectValid = true;
  let isHitValid = true;
  let r = lastClick[0];
  let c = lastClick[1];
  if (_.isEqual(lastClick, [i, j])) {
    return isRangeValid;
  }
  if (board[r][c].type === '') {
    return -1; // 当前使用道具的主体已被摧毁
  }
  if (item.name === 'sword') {
    const arrayToCheck = [[r, c + 1], [r, c - 1], [r + 1, c], [r - 1, c]];
    isRangeValid = arrayToCheck.some(([a, b]) => (a === i && b === j));
    if (!isRangeValid) {
      // openModal('目标超出攻击范围！');
      playSound(Error_Target);
    }
    else if (board[i][j].type === '') {
      if (board[i][j].status.frozen) {
        // openModal('敲碎了冰块');
      } else {
        // openModal('糟糕，没有击中目标！');

      }
    }
    else if (board[i][j].type === board[r][c].type) {
      if (board[i][j].status.frozen) {
        // openModal('敲碎了冰块');
      }
      else {
        isObjectValid = false;
        playSound(Error_Target);
        // openModal('不能攻击同类棋子');
      }
    }
    else if (!board[i][j].canBeDestroyed) {
      // openModal('给予敌方装甲致命一击！');
    }
    else {
      // openModal('轻轻一击');
    }
  }
  else if (item.name === 'bow') {
    const arrayToCheck = [[r, c + 1], [r, c - 1], [r + 1, c], [r - 1, c], [r - 1, c - 1], [r - 1, c + 1], [r + 1, c - 1], [r + 1, c + 1]];
    isRangeValid = arrayToCheck.some(([a, b]) => (a === i && b === j));
    if (!isRangeValid) {
      // openModal('太远了，打不到！');
      playSound(Error_Target);
    }
    else if (board[i][j].type === '') {
      if (board[i][j].status.frozen) {
        // openModal('击碎了冰块');
      } else {
        // openModal('糟糕，箭射偏了！');
      }
    }
    else if (board[i][j].type === board[r][c].type) {
      if (board[i][j].status.frozen) {
        // openModal('击碎了冰块');
      } else {
        isObjectValid = false;
        // openModal('不能打同类！');
        playSound(Error_Target);
      }
    }
    else if (!board[i][j].canBeDestroyed) {
      if (board[i][j].status.frozen) {
        // openModal('击碎了冰块');
      } else {
        // isHitValid = false;
        // openModal('未能击穿敌方装甲！');
        const currPiece = board[r][c];
        board[i][j].handleSound(item, board, currPiece);
      }
    }
    else {
      // openModal('轻轻一击');
    }
  }
  else if (item.name === 'shield') {
    return true;
  } else if (item.name === 'infectPotion') {
    const arrayToCheck = [[r, c + 1], [r, c - 1], [r + 1, c], [r - 1, c]];
    isRangeValid = arrayToCheck.some(([a, b]) => (a === i && b === j));
    if (!isRangeValid) {
      // openModal('太远了，无法侵蚀！');
      playSound(Error_Target);
    }
    if (board[i][j].status.frozen) {
      isObjectValid = false;
      // openModal('无法侵蚀冰块！');
      playSound(Error_Target);
    }
    else if (board[i][j].type === '') {
      // openModal('糟糕，没有侵蚀目标！');
    }
    else if (board[i][j].type === board[r][c].type) {
      isObjectValid = false;
      // openModal('不能侵蚀同类棋子');
      playSound(Error_Target);
    }
    else if (!board[i][j].canBeDestroyed) {
      isHitValid = false;
      // openModal('目标具有护盾，不能被侵蚀！');
      const currPiece = board[r][c];
      board[i][j].handleSound(item, board, currPiece);
    }
    else {
      // openModal('侵蚀成功！');
    }
  }
  else if (item.name === 'timeBomb') {
    isRangeValid = true;
    isHitValid = true;
    if (board[i][j].type !== '') {
      isObjectValid = false;
      openModal('不能在棋子上放置炸弹！');
      playSound(Error_Target);
    }
    else {
      // openModal('炸弹放置成功！');
    }
  }
  return isRangeValid && isObjectValid && isHitValid;
}

function doItem(item, board, i, j, lastClick) {
  let r = lastClick[0];
  let c = lastClick[1];
  const currPiece = board[r][c];
  switch (item.name) {
    case 'shield': {
      break;
    }
    case 'sword':
    case 'bow': {
      currPiece.status.withItem = Item.NONE;
      board[i][j].destroy(item, board, currPiece);
      break;
    }
    case 'infectPotion': {
      currPiece.status.withItem = Item.NONE;
      board[i][j].infect(item, currPiece, board);
      break;
    }
    case 'timeBomb': {
      board[i][j].attachBomb();
      break;
    }
    case 'xFlower': {
      board[i][j].attachSeed();
      break;
    }
    default: {
      break;
    }
  }
  currPiece.setStyle();
}

function SwitchSoundButton() {
  const [buttonStatus, setButtonStatus] = useState(CLOSE_SOUND);
  function onButtonClick() {
    _isMute = !_isMute;
    if (_isMute) {
      setButtonStatus(OPEN_SOUND);
    }
    else {
      setButtonStatus(CLOSE_SOUND);
    }
  }
  return (
    <button className='button-normal' onClick={onButtonClick}>{buttonStatus}</button>
  );
}

function VolumeControlButton() {
  const [volume, setVolume] = useState(MAX_VOLUME);

  function handleVolumeChange(amount) {
    _volume += amount;
    if (_volume > MAX_VOLUME) {
      _volume = MAX_VOLUME;
    }
    else if (_volume < 0) {
      _volume = MIN_VOLUME;
    }
    setVolume(_volume);
  }

  return (
    <div>
      <span>{VOLUME}</span>
      <button className='button-normal' onClick={() => { handleVolumeChange(-VOLUME_PER_TIME) }}>
        <MinusOutlined />
      </button>
      <span>{volume}</span>
      <button className='button-normal' onClick={() => { handleVolumeChange(VOLUME_PER_TIME) }}>
        <PlusOutlined />
      </button>
    </div>
  );
};

function Game({ boardWidth, boardHeight, items, setItems, setRestart,
  round, setRound, roundMoveArr, setRoundMoveArr, totalRound, setTotalRound,
  gameLog, setGameLog, isRestart, gameMode, setGameMode, GameMode,
  socket, pieceType, lastStep, seeds, deviceType, roomDeviceType,
  isPlayerLeaveRoomModalOpen, setPlayerLeaveRoomModalOpen,
  isPlayerDisconnectedModalOpen, setPlayerDisconnectedModalOpen,
  gameOver, setGameOver, isRestartRequestModalOpen, setRestartRequestModalOpen,
  restartResponseModalOpen, setRestartResponseModalOpen,
  isSkipRound, setSkipRound, setRestartInSameRoom, isUndoRound,
  setUndoRoundRequestModalOpen, avatarIndex, avatarIndexPB, setChatPanelOpen,
  completelyReady, globalSignal }) {

  const [canSkipRound, setCanSkipRound] = useState(true);
  // 消息弹窗
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalInfo, setModalInfo] = useState('');
  const timeoutIdRef = useRef(null);

  const [gameStart, setGameStart] = useState(false);
  const [board, setBoard] = useState(() => createBoard(boardWidth, boardHeight, setGameStart));
  const [history, setHistory] = useState([board]);
  const [currentMove, setCurrentMove] = useState(0);
  const currentBoard = history[currentMove];
  let random1, random2;
  if (gameMode === GameMode.MODE_ROOM || gameMode === GameMode.MODE_MATCH) {
    random1 = seeds[0];
    random2 = seeds[1];
  } else {
    random1 = Math.random();
    random2 = Math.random();
  }
  const [selectedItem, setSelectedItem] = useState(items[Math.floor(random1 * items.length)]);
  const [nextSelItem, setNextSelItem] = useState(items[Math.floor(random2 * items.length)]);
  // console.log('selectedItem:' + selectedItem.cname);
  // console.log('nextSelItem:' + nextSelItem.cname);
  // console.log('++++++');

  const [selectedItemHistory, setSelectedItemHistory] = useState([selectedItem]);
  const [xIsNext, setIsNext] = useState(true);
  const [isUndo, setIsUndo] = useState(false);
  const [isRedo, setIsRedo] = useState(false);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isSkipModalOpen, setSkipModalOpen] = useState(false);
  const [lastClick, setLastClick] = useState([null, null]);
  const [isRestartModalOpen, setRestartModalOpen] = useState(false);

  function pickRandomItem() {
    if (selectedItem.isUsed) {
      const temp = items.filter(item => item !== selectedItem && !item.isUsed && item !== undefined &&
        item !== nextSelItem);
      setItems(temp);
      // const randomIndex = Math.floor(Math.random() * items.length);
      // const randomItem = items[randomIndex];
      setSelectedItem(nextSelItem);
      let random;
      if (gameMode === GameMode.MODE_ROOM || gameMode === GameMode.MODE_MATCH) {
        random = seeds[round];
      }
      else {
        random = Math.random();
      }
      const nextIndex = Math.floor(random * temp.length);
      const nextRandomItem = temp[nextIndex];

      setNextSelItem(nextRandomItem);

      // console.log('random:' + random);
      // console.log('tempLength:' + temp.length);
      // console.log('itemsLength:' + items.length);
      // console.log('nextIndex:', +nextIndex);
      // if (nextSelItem === nextRandomItem) {
      //   console.log('同一个对象');
      // }
      // console.log('lastSelItem:' + selectedItem.cname + ',used:' + selectedItem.isUsed)
      // console.log('selectedItem:' + nextSelItem.cname + ',used:' + nextSelItem.isUsed);
      // console.log('nextSelItem:' + nextRandomItem.cname + ',used:' + nextRandomItem.isUsed);
      // console.log('-----');
    }
    const nextItemHistory = [...selectedItemHistory.slice(0, currentMove + 1), selectedItem];
    setSelectedItemHistory(nextItemHistory);
  };

  function logAction(srcPiece, tarPiece, item, isGameOver) {
    if (isGameOver) {
      const actionInfo = srcPiece.type + ' 胜利！';
      setGameLog([...gameLog, [actionInfo, srcPiece, tarPiece, selectedItem]]);
    }
    else {
      item.srcPiece = srcPiece;
      item.tarPiece = tarPiece;
      const actionInfo = item.do();
      setGameLog([...gameLog, [actionInfo, srcPiece, tarPiece, selectedItem]]);
    }
  }

  function handlePlay(lastClick, setLastClick, nextBoard, i, j) {
    // 重置悔棋、还原标志
    setIsUndo(false);
    setIsRedo(false);

    if (!selectedItem.isUsed && selectedItem.before) {
      // 判断二次选中棋子合法性
      let isValid = validateLoc(selectedItem, lastClick, i, j, currentBoard, openModal, closeModal);
      if (isValid === true) {
        logAction(nextBoard[lastClick[0]][lastClick[1]], nextBoard[i][j], selectedItem);
        doItem(selectedItem, nextBoard, i, j, lastClick);
        setIsNext(!xIsNext);
      }
      else if (isValid === -1) {
        setIsNext(!xIsNext);
      }
      else if (isValid === -2) {
        setIsNext(!xIsNext);
      }
      else {
        return;
      }
    }
    if (_.isEqual(lastClick, [null, null])) {
      nextBoard[i][j].useItem(selectedItem, nextBoard);
      setIsNext(!xIsNext);
      logAction(nextBoard[i][j], nextBoard[i][j], selectedItem);
    }
    if (_.isEqual(lastClick, [i, j])) {
      if (nextBoard[i][j] !== '') {
        // return;
      }
    }
    if (selectedItem.name === 'shield') {
      nextBoard[i][j].useItem(selectedItem, nextBoard);
      setIsNext(!xIsNext);
      playSound(Take_Shield);
      logAction(nextBoard[i][j], nextBoard[i][j], selectedItem);
    }
    else if (selectedItem.name === 'timeBomb') {
      nextBoard[i][j].useItem(selectedItem, nextBoard);
      setIsNext(!xIsNext);
      logAction(nextBoard[i][j], nextBoard[i][j], selectedItem);
    }
    else if (selectedItem.name === 'xFlower') {
      nextBoard[i][j].useItem(selectedItem, nextBoard);
      setIsNext(!xIsNext);
      logAction(nextBoard[i][j], nextBoard[i][j], selectedItem);
    }
    else if (selectedItem instanceof FreezeSpell) {
      nextBoard[i][j].useItem(selectedItem, nextBoard);
      setIsNext(!xIsNext);
      logAction(nextBoard[i][j], nextBoard[i][j], selectedItem);
    }
    else {
      if (!selectedItem.before && !selectedItem.isUsed) {
        nextBoard[i][j].beforeUse(selectedItem);
        playSound(Place_Piece);
      }
    }
    // 后处理事件
    let statusObj = { pieceStatus: InitPieceStatus };
    let haveValid = haveValidPiece(selectedItem, lastClick, i, j, nextBoard, statusObj);
    if (!haveValid) {
      if (selectedItem.before) {
        logAction(nextBoard[i][j], nextBoard[i][j], selectedItem);
        // 清除棋子持有道具状态
        nextBoard[i][j].status.withItem = Item.NONE;
        nextBoard[i][j].setStyle();
      }
      selectedItem.isUsed = true;
    }
    let bombed = false;
    nextBoard.forEach((row) => {
      row.forEach((cell) => {
        if (selectedItem.isUsed) {
          cell.liveTime -= 1;
        }
        if (cell.liveTime === 0 || cell.status.bombCount > 0) {
          bombed = true;
          cell.bomb(null, nextBoard, bombed);
        }
      })
    });
    if (bombed) {
      playSound(Bomb_Bomb);
    }
    let grew = false;
    let grown = false;
    nextBoard.forEach((row) => {
      row.forEach((cell) => {
        if (selectedItem.isUsed) {
          cell.growthTime -= 1;
        }
        if (cell.growthTime >= 0) {
          grew = true;
          if (cell.grow(null)) {
            grown = true;
          }
        }
      })
    });
    if (grown) {
      playSound(Flower_Full_Grown);
    }
    if (bombed || !haveValid) {
      if (bombed && nextBoard[i][j].liveTime > 0) {
        setIsNext(!xIsNext);
        selectedItem.before = false;
        selectedItem.isUsed = true;
      }
      else if (!haveValid) {
        if (!selectedItem.isUsed) {
          // openModal('没有有效目标，已为您自动跳过！');
        }
        setIsNext(!xIsNext);
        selectedItem.before = false;
        selectedItem.isUsed = true;
      }
    }
    nextBoard[i][j].setSquareStyle(selectedItem);
    pickRandomItem();
    const nextHistory = [...history.slice(0, currentMove + 1), nextBoard];
    setHistory(nextHistory);
    setCurrentMove(nextHistory.length - 1);
    setLastClick([i, j]);
  }

  function jumpTo(nextRound, isUndo, isRedo) {
    if (isUndo) {
      if (nextRound < 1) {
        return;
      }
      setIsUndo(true);
      setIsNext(!xIsNext);
      const lastMove = roundMoveArr[nextRound - 1];
      setCurrentMove(lastMove);
      setRound(round - 1);
      setSelectedItem(selectedItemHistory[lastMove]);
      for (const [index, item] of selectedItemHistory.entries()) {
        if (index >= lastMove) {
          item.isUsed = false;
        }
      }
    }
    else if (isRedo) {
      if (nextRound > roundMoveArr.length || nextRound > totalRound) {
        return;
      }
      setIsRedo(true);
      setIsNext(!xIsNext);
      const nextMove = roundMoveArr[nextRound - 1];
      setCurrentMove(nextMove);
      setRound(round + 1);
      setSelectedItem(selectedItemHistory[nextMove]);
      for (const [index, item] of selectedItemHistory.entries()) {
        if (index >= nextMove) {
          item.isUsed = false;
        }
      }
    }
  }

  const moves = history.map((board, move) => {
    if (move === 0) {
      return null;
    }
    let description = '回退到：' + move;
    return (
      <li key={move}>
        <button onClick={() => jumpTo(move)}>{description}</button>
      </li>
    );
  });

  function isMyRound() {
    return (pieceType === Piece_Type_Black && xIsNext) || (pieceType === Piece_Type_White && !xIsNext);
  }

  const UndoButton = () => {
    let description = "悔棋";
    return (
      <button className='button-normal' onClick={() => {
        if (gameMode === GameMode.MODE_SIGNAL || gameMode === GameMode.MODE_AI) {
          jumpTo(round - 1, true, false);
        }
        else {
          setUndoRoundRequestModalOpen(true);
          socket.emit('undoRoundRequest');
        }

      }} disabled={gameOver ? true : ((gameMode === GameMode.MODE_SIGNAL || gameMode === GameMode.MODE_AI) ? (round === 1) : (isMyRound() ||
        (round === 1) ||
        (pieceType === Piece_Type_White && round === 2)))
      }>{description}</button>
    );
  }

  const RedoButton = () => {
    let validate = (gameMode === GameMode.MODE_MATCH || gameMode === GameMode.MODE_ROOM) ? true : false;
    let description = "还原";
    const nextRound = round + 1;
    return (
      <button className='button-normal' onClick={() => jumpTo(nextRound, false, true)}
        disabled={validate || (round === 1) || (round === totalRound)}>{description}</button>
    );
  }

  const restartGame = () => {
    const initBoardHistory = [...history.slice(0, 1)];
    setHistory(initBoardHistory);
    setCurrentMove(0);
    const initItemHistory = [...selectedItemHistory.slice(0, 1)];
    setSelectedItemHistory(initItemHistory);
    let random1, random2;
    if (gameMode === GameMode.MODE_ROOM || gameMode === GameMode.MODE_MATCH) {
      random1 = seeds[0];
      random2 = seeds[1];
    } else {
      random1 = Math.random();
      random2 = Math.random();
    }
    setSelectedItem(items[Math.floor(random1 * items.length)]);
    setNextSelItem(items[Math.floor(random2 * items.length)]);
    setGameOver(false);
    setIsNext(true);
    setRound(1);
  }

  const RestartButton = () => {
    let description = RESTART_GAME;
    function onButtonClick() {
      if (gameMode === GameMode.MODE_SIGNAL || gameMode === GameMode.MODE_AI) {
        setRestart(true);
      }
      else {
        if (gameOver) {
          setRestartResponseModalOpen(true);
          socket.emit('restart', { gameMode, gameOver });
        }
        else {
          setRestartModalOpen(true);
        }
      }
      setRestartInSameRoom(true);
    }
    return (
      <button className='button-normal' onClick={onButtonClick}>{description}</button>
    );
  }

  const ExitButton = () => {
    let description = "退出";
    useEffect(() => {
      if (globalSignal && globalSignal[GlobalSignal.Active] && globalSignal[GlobalSignal.ReturnMenu]) {
        onButtonClick();
      }
    }, [globalSignal]);
    function onButtonClick() {
      setConfirmModalOpen(true);
    }
    return (
      <button className='button-exit' onClick={onButtonClick}>{description}</button>
    );
  }

  const SkipButton = () => {
    let description = "跳过";
    function onButtonClick() {
      if (gameMode === GameMode.MODE_SIGNAL || gameMode === GameMode.MODE_AI) {
        // skipRound();
        setSkipRound(true);
      }
      else {
        setSkipModalOpen(true);
      }
    }
    return (
      <button className='button-normal' onClick={onButtonClick} disabled={!canSkipRound}>{description}</button>
    );
  }

  function skipRound() {
    if (!_.isEqual(lastClick, [null, null])) {
      const r = lastClick[0];
      const c = lastClick[1];
      const currPiece = currentBoard[r][c];
      logAction(currPiece, currPiece, selectedItem);
      if (selectedItem instanceof Sword || selectedItem instanceof Bow || selectedItem instanceof InfectPotion) {
        currPiece.status.withItem = Item.NONE;
        currPiece.setStyle();
        currPiece.setSquareStyle();
      }
    }
    pickRandomItem();
    setIsNext(!xIsNext);
    if (gameMode !== GameMode.MODE_SIGNAL || gameMode === GameMode.MODE_AI) {
      setSkipModalOpen(false);
    }
  }

  function exitGame() {
    if (gameMode === GameMode.MODE_ROOM || gameMode === GameMode.MODE_MATCH) {
      socket.emit('leaveRoom');
    }
    setGameMode(GameMode.MODE_NONE);
    setRestart(true);
    restartGame();
  }

  const openModal = (info, time = 500) => {
    // return;//暂时屏蔽弹窗
    setModalOpen(true);
    setModalInfo(info);
    timeoutIdRef.current = setTimeout(() => {
      closeModal();
    }, time);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  // 设置棋盘长宽
  useEffect(() => {
    let dType;
    if (gameMode === GameMode.MODE_ROOM || gameMode === GameMode.MODE_MATCH) {
      dType = roomDeviceType;
    }
    else if (gameMode === GameMode.MODE_SIGNAL || gameMode === GameMode.MODE_AI) {
      dType = deviceType;
    }
    switch (dType) {
      case DeviceType.PC: {
        break;
      }
      case DeviceType.MOBILE: {
        root.style.setProperty('--gamelog-button-width', '45vh');
        break;
      }
      default: break;
    }
    Board_Width = boardWidth;
    Board_Height = boardHeight;

  }, [boardWidth, boardHeight]);

  // 使用 useEffect 来清除定时器，确保在组件卸载时不会触发关闭
  useEffect(() => {
    const timeoutId = timeoutIdRef.current;
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (isUndo || isRedo) {
      return;
    }
    setRound(round + 1);
    setTotalRound(round + 1);
    const tempArr = [...roundMoveArr.slice(0, round + 1), currentMove];
    setRoundMoveArr(tempArr);
    if (gameOver) {
      setCanSkipRound(false);
    }
    else if (gameMode === GameMode.MODE_MATCH || gameMode === GameMode.MODE_ROOM) {
      if ((pieceType === Piece_Type_Black && xIsNext) ||
        (pieceType === Piece_Type_White && !xIsNext)) {
        setCanSkipRound(true);
      }
      else {
        setCanSkipRound(false);
      }
    }
    else {
      setCanSkipRound(true);
    }
  }, [xIsNext]);

  useEffect(() => {
    if (isRestart) {
      restartGame();
    }
  }, [isRestart]);

  useEffect(() => {
    if (isUndoRound) {
      const nextRound = round - 1;
      jumpTo(nextRound, true, false);
    }
  }, [isUndoRound]);

  return (
    <div className="game">
      <div className="game-board">
        <Board xIsNext={xIsNext} board={currentBoard} setBoard={setBoard}
          currentMove={currentMove} onPlay={handlePlay} gameOver={gameOver}
          setGameOver={setGameOver} selectedItem={selectedItem} nextSelItem={nextSelItem} selectedItemHistory={selectedItemHistory}
          gameStart={gameStart} setGameStart={setGameStart} openModal={openModal}
          playSound={playSound} UndoButton={UndoButton} RedoButton={RedoButton}
          RestartButton={RestartButton} SwitchSoundButton={SwitchSoundButton}
          VolumeControlButton={VolumeControlButton} logAction={logAction}
          isRestart={isRestart} lastClick={lastClick} setLastClick={setLastClick}
          socket={socket} pieceType={pieceType} lastStep={lastStep} gameMode={gameMode}
          skipRound={skipRound} isSkipRound={isSkipRound} ExitButton={ExitButton} SkipButton={SkipButton}
          avatarIndex={avatarIndex} avatarIndexPB={avatarIndexPB} setChatPanelOpen={setChatPanelOpen}
          completelyReady={completelyReady}
        />
      </div>
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <span className="close-button" onClick={closeModal}>
              &times;
            </span>
            <p>{modalInfo}</p>
          </div>
        </div>
      )}
      {isConfirmModalOpen && (
        <ConfirmModal modalInfo='确定退出游戏吗？' onOkBtnClick={exitGame} OnCancelBtnClick={() => setConfirmModalOpen(false)} />
      )}
      {isSkipModalOpen && (
        <ConfirmModal modalInfo='确定跳过本回合吗？'
          onOkBtnClick={() => {
            socket.emit('skipRound');
            setSkipModalOpen(false);
          }}
          OnCancelBtnClick={() => setSkipModalOpen(false)} />
      )}
      {isPlayerLeaveRoomModalOpen && (
        <InfoModal modalInfo='对方离开了房间' setModalOpen={setPlayerLeaveRoomModalOpen} />
      )}
      {isPlayerDisconnectedModalOpen && (
        <InfoModal modalInfo='对方断开连接' setModalOpen={setPlayerDisconnectedModalOpen} />
      )}
      {isRestartModalOpen && (
        <ConfirmModal modalInfo='游戏仍未结束，确定重新开始吗？' onOkBtnClick={() => {
          setRestartModalOpen(false);
          setRestartResponseModalOpen(true);
          setTimeout(() => {
            socket.emit('restart', { gameMode, gameOver });
          }, 1000);
        }} OnCancelBtnClick={() => setRestartModalOpen(false)} />
      )}
      {restartResponseModalOpen && (
        <Modal modalInfo='等待对方回应...' setModalOpen={setRestartResponseModalOpen} timeDelay={false} />
      )}
      {isRestartRequestModalOpen && (
        <ConfirmModal modalInfo=
          {gameOver ? '对方邀请您再来一局，是否接受？' : '游戏仍未结束，对方请求重新开局，确定重新开始吗？'}
          onOkBtnClick={() => {
            // setRestart(true);
            setRestartRequestModalOpen(false);
            socket.emit('restart_response', true);
          }}
          OnCancelBtnClick={() => {
            setRestartRequestModalOpen(false);
            socket.emit('restart_response', false);
          }} />
      )}
    </div>
  );
}

function checkIsBoardFull(board, selectedItem) {
  let nWhitePiece = 0;
  let nBlackPiece = 0;
  board.map((row, rowIndex) => {
    row.map((cell, colIndex) => {
      if (cell.type === Piece_Type_Black) {
        nBlackPiece++;
      }
      else if (cell.type === Piece_Type_White) {
        nWhitePiece++;
      }
      return null;
    });
    return null;
  });
  if (((nWhitePiece + nBlackPiece) === Board_Width * Board_Height) &&
    selectedItem.isUsed) {
    if (nWhitePiece >= nBlackPiece) {
      return [Piece_Type_White, [null, null], [nBlackPiece, nWhitePiece]];
    }
    else {
      return [Piece_Type_Black, [null, null], [nBlackPiece, nWhitePiece]];
    }
  }
  return false;
}

function calculateWinner(board, x, y, selectedItem) {
  if (x < 0 || x >= Board_Width || y < 0 || y >= Board_Height || x === undefined || y === undefined) {
    return false;
  }
  const checkResult = checkIsBoardFull(board, selectedItem);
  if (checkResult) {
    return checkResult;
  }
  if (board[y][x].status.frozen || board[y][x].status.attachBomb) {
    return false;
  }
  const directions = [
    [1, 0], [0, 1], [1, 1], [1, -1], // 水平、垂直、右斜、左斜方向
  ];

  const currentType = board[y][x].type;
  const checkDirection = (dx, dy) => {
    // 计算当前方向上的连珠数
    const count = (dx, dy) => {
      let count = 0;
      let coordinates = [];
      let i = 1;
      while (i <= 4) {
        const newX = x + i * dx;
        const newY = y + i * dy;
        if (newX >= 0 && newX < Board_Width && newY >= 0 && newY < Board_Height && board[newY][newX].type === currentType &&
          !board[newY][newX].status.frozen && !board[newY][newX].status.attachBomb) {
          // 判断特殊效果
          count += 1;
          coordinates.push([newY, newX]);
        } else {
          break;
        }
        i++;
      }
      let result = [count, coordinates]
      return result;
    };

    // 检查当前方向上是否有五子连珠
    let res1 = count(dx, dy);
    let res2 = count(-dx, -dy);
    let count1 = res1[0];
    let count2 = res2[0];
    let coordinates1 = res1[1];
    let coordinates2 = res2[1];
    let rest = [];
    if (count1 + count2 >= 4) {
      let tem = [...coordinates1.reverse(), ...coordinates2].slice(0, 4);
      tem.push([y, x]);
      rest.push(currentType, tem);
    }
    else {
      rest.push(null, [null, null]);
    }
    return rest;
  };

  // 检查所有方向
  for (const [dx, dy] of directions) {
    const winnerInfo = checkDirection(dx, dy);
    if (winnerInfo[0] !== null) {
      return winnerInfo;
    }
  }
  return [null, [null, null]];
};

function initScores(w, h, board) {
  let scores = [];
  for (let i = 0; i < h; i++) {
    scores[i] = []; // 创建一个空数组作为二维数组的每一行
    for (let j = 0; j < w; j++) {
      if (board[i][j].type === '') { // Exclude piece
        scores[i][j] = 0; // 初始化每个元素为 0
      }
      else {
        scores[i][j] = -Infinity;
      }
    }
  }
  return scores;
}

function checkDanger(board, x, y, scores, item) {
  const directions = [
    [1, 0], [0, 1], [1, 1], [1, -1], // 水平、垂直、右斜、左斜方向
  ];
  const width = board[0].length;
  const height = board.length;

  const checkDirection = (dx, dy) => {
    // 计算当前方向上的连珠数
    const count = (dx, dy) => {
      let count = 0;
      let i = 1;
      while (i <= 4) {
        const newX = x + i * dx;
        const newY = y + i * dy;
        if (newX >= 0 && newX < height && newY >= 0 && newY < width && board[newX][newY].type === Piece_Type_Black &&
          !board[newX][newY].status.frozen && !board[newX][newY].status.attachBomb) {
          count += 1;
        } else {
          break;
        }
        i++;
      }
      return count;
    };

    let count1 = count(dx, dy);
    let count2 = count(-dx, -dy);
    if (count1 + count2 >= 4) {
      if (item instanceof Shield || item instanceof XFlower) {
        scores[x][y] += 100;
      }
      else {
        scores[x][y] += 40;
      }
    }
    else if (count1 + count2 >= 3) {
      if (item instanceof Shield || item instanceof XFlower) {
        scores[x][y] += 30;
      }
      else {
        scores[x][y] += 10;
      }
    }
  };

  // 检查所有方向
  for (const [dx, dy] of directions) {
    checkDirection(dx, dy);
  }
};

function updateScoreByPos(board, r, c, scores) {
  const width = board[0].length;
  const height = board.length;
  // 检查敌方花朵
  const arrayToCheckFlower = [[r - 1, c], [r, c - 1], [r, c + 1],
  [r + 1, c]];
  for (const arr of arrayToCheckFlower) {
    const x = arr[0];
    const y = arr[1];
    if (x >= 0 && x < width && y >= 0 && y < height) {
      if (board[x][y].attachSeed && board[x][y].type === Piece_Type_Black) {
        scores[r][c] += 5;
      }
    }
  }

  // 检查一环棋子
  const arrayToCheckFirstRing = [[r - 1, c - 1], [r - 1, c], [r - 1, c + 1],
  [r, c - 1], [r, c + 1],
  [r + 1, c - 1], [r + 1, c], [r + 1, c + 1]];
  for (const arr of arrayToCheckFirstRing) {
    const x = arr[0];
    const y = arr[1];
    if (x >= 0 && x < width && y >= 0 && y < height) {
      if (board[x][y].type !== '') {
        scores[r][c] += 1;
      }
    }
  }

  // 检查二环棋子
  const arrayToCheckSecondRing = [[r - 2, c - 2], [r - 2, c - 1], [r - 2, c], [r - 2, c + 1], [r - 2, c + 2],
  [r - 1, c - 2], [r - 1, c + 1],
  [r, c - 2], [r, c + 2],
  [r + 1, c - 2], [r + 1, c + 2],
  [r + 2, c - 2], [r + 2, c - 1], [r + 2, c], [r + 2, c + 1], [r + 2, c + 2]];
  for (const arr of arrayToCheckSecondRing) {
    const x = arr[0];
    const y = arr[1];
    if (x >= 0 && x < width && y >= 0 && y < height) {
      if (board[x][y].type !== '') {
        scores[r][c] += 0.5;
      }
    }
  }
}

function updateScoreByItem(board, r, c, scores, item) {
  const width = board[0].length;
  const height = board.length;
  if (item instanceof Sword) {
    const arrayToCheckSword = [[r - 1, c], [r, c - 1], [r, c + 1],
    [r + 1, c]];
    for (const arr of arrayToCheckSword) {
      const x = arr[0];
      const y = arr[1];
      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (board[x][y].type === Piece_Type_Black && !board[x][y].canBeDestroyed) {
          scores[r][c] += 1;
        }
      }
    }
  }
  else if (item instanceof Shield) {
    // 检查一环棋子
    const arrayToCheckFirstRing = [[r - 1, c - 1], [r - 1, c], [r - 1, c + 1],
    [r, c - 1], [r, c + 1],
    [r + 1, c - 1], [r + 1, c], [r + 1, c + 1]];
    for (const arr of arrayToCheckFirstRing) {
      const x = arr[0];
      const y = arr[1];
      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (board[x][y].type === Piece_Type_White) {
          scores[r][c] += 1;
        }
      }
    }
  }
  else if (item instanceof Bow) {
    // 检查一环棋子
    const arrayToCheckFirstRing = [[r - 1, c - 1], [r - 1, c], [r - 1, c + 1],
    [r, c - 1], [r, c + 1],
    [r + 1, c - 1], [r + 1, c], [r + 1, c + 1]];
    for (const arr of arrayToCheckFirstRing) {
      const x = arr[0];
      const y = arr[1];
      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (board[x][y].type !== '') {
          scores[r][c] += 1;
        }
      }
    }
  }
  else if (item instanceof TimeBomb) {
    const arrayToCheckSword = [[r - 1, c], [r, c - 1], [r, c + 1],
    [r + 1, c]];
    for (const arr of arrayToCheckSword) {
      const x = arr[0];
      const y = arr[1];
      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (board[x][y].type === Piece_Type_Black) {
          scores[r][c] += 1;
        }
      }
    }
  }
  else if (item instanceof InfectPotion) {
    const arrayToCheckSword = [[r - 1, c], [r, c - 1], [r, c + 1],
    [r + 1, c]];
    for (const arr of arrayToCheckSword) {
      const x = arr[0];
      const y = arr[1];
      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (board[x][y].type === Piece_Type_Black) {
          scores[r][c] += 1;
        }
      }
    }
  }
  else if (item instanceof XFlower) {
    // 检查一环棋子
    const arrayToCheckFirstRing = [[r - 1, c - 1], [r - 1, c], [r - 1, c + 1],
    [r, c - 1], [r, c + 1],
    [r + 1, c - 1], [r + 1, c], [r + 1, c + 1]];
    for (const arr of arrayToCheckFirstRing) {
      const x = arr[0];
      const y = arr[1];
      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (board[x][y].type === '') {
          scores[r][c] += 1;
        }
      }
    }
  }
  else if (item instanceof FreezeSpell) {
    // 检查一环棋子
    const arrayToCheckFirstRing = [[r - 1, c - 1], [r - 1, c], [r - 1, c + 1],
    [r, c - 1], [r, c + 1],
    [r + 1, c - 1], [r + 1, c], [r + 1, c + 1]];
    for (const arr of arrayToCheckFirstRing) {
      const x = arr[0];
      const y = arr[1];
      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (board[x][y].type === Piece_Type_Black) {
          scores[r][c] += 1;
        }
      }
    }
  }
}

function findMaxIndex(arr) {
  let index = [];
  let max = arr[0][0]; // 假设数组中的第一个元素是最大值

  let i, j;
  for (i = 0; i < arr.length; i++) {
    for (j = 0; j < arr[i].length; j++) {
      if (arr[i][j] > max) {
        max = arr[i][j]; // 更新最大值
      }
    }
  }
  for (i = 0; i < arr.length; i++) {
    for (j = 0; j < arr[i].length; j++) {
      if (arr[i][j] === max) {
        index.push([i, j]);
      }
    }
  }
  return index;
}

function getPiecePos(board, item) {
  const scores = initScores(board[0].length, board.length, board);
  board.map((row, x) => {
    row.map((cell, y) => {
      if (board[x][y].type === '') {
        if (board[x][y].liveTime > 0) {
          scores[x][y] += -999;
        }
        if (board[x][y].status.frozen) {
          scores[x][y] += -10;
        }
        if (board[x][y].growthTime > 0 && board[x][y].willBe === Piece_Type_Black) {
          scores[x][y] += 5;
        }
        // 更新得分
        updateScoreByPos(board, x, y, scores);
        checkDanger(board, x, y, scores, item);
        updateScoreByItem(board, x, y, scores, item);
      }
      return null;
    });
    return null;
  });
  return findMaxIndex(scores);
}

function getItemPos(board, item, bestPiecePos) {
  const r = bestPiecePos[0];
  const c = bestPiecePos[1];
  const width = board[0].length;
  const height = board.length;
  let resx = null, resy = null;

  if (item instanceof Sword) {
    const arrayToCheckSword = [[r - 1, c], [r, c - 1], [r, c + 1],
    [r + 1, c]];
    for (const arr of arrayToCheckSword) {
      const x = arr[0];
      const y = arr[1];
      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (board[x][y].liveTime > 0) {
          continue;
        }
        if ((board[x][y].type === Piece_Type_Black && !board[x][y].status.frozen) ||
          (board[x][y].type === Piece_Type_White && board[x][y].status.frozen)) {
          resx = x;
          resy = y;
          break;
        }
      }
    }
  }
  else if (item instanceof Bow) {
    const arrayToCheckBow = [[r - 1, c - 1], [r - 1, c], [r - 1, c + 1],
    [r, c - 1], [r, c + 1],
    [r + 1, c - 1], [r + 1, c], [r + 1, c + 1]];
    for (const arr of arrayToCheckBow) {
      const x = arr[0];
      const y = arr[1];
      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          if (!board[x][y].canBeDestroyed || board[x][y].liveTime > 0) {
            continue;
          }
          if ((board[x][y].type === Piece_Type_Black && !board[x][y].status.frozen) ||
            (board[x][y].type === Piece_Type_White && board[x][y].status.frozen)) {
            resx = x;
            resy = y;
            break;
          }
        }
      }
    }
  }
  else if (item instanceof InfectPotion) {
    const arrayToCheckPotion = [[r - 1, c], [r, c - 1], [r, c + 1],
    [r + 1, c]];
    for (const arr of arrayToCheckPotion) {
      const x = arr[0];
      const y = arr[1];
      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (board[x][y].status.frozen || !board[x][y].canBeDestroyed || board[x][y].liveTime > 0) {
          continue;
        }
        if (board[x][y].type === Piece_Type_Black) {
          resx = x;
          resy = y;
          break;
        }
      }
    }
  }
  return [resx, resy];

}

function calculateNextStep(board, item) {
  const piecePos = getPiecePos(board, item);
  const bestPiecePos = piecePos[Math.floor(Math.random() * piecePos.length)];
  let bestItemPos;
  if (item instanceof Sword || item instanceof Bow || item instanceof InfectPotion) {
    bestItemPos = getItemPos(board, item, bestPiecePos);
  }
  return [bestPiecePos, bestItemPos];
}

export default Game;
