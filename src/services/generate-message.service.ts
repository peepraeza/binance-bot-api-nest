import { Injectable } from '@nestjs/common';
import { FlexBubble, FlexContainer } from '@line/bot-sdk/lib/types';
import { TradingViewReqDto } from '../dto/webhook/trading-view.req.dto';
import * as symbolImage from '../constant-json/symbol-image.json';
import { dateToString } from '../utils/utils';
import { OpeningPositionDto } from '../dto/opening-position.dto';
import { COLOR_GREEN, COLOR_RED } from '../constants/constants';
import { TradingHistoryDto } from '../dto/trading-history.dto';
import moment from 'moment-timezone';
import { ClosedPositionDto } from '../dto/closed-position.dto';
import { ActionPositionEnum } from '../enums/action-position.enum';
import { ActionPositionDto } from '../dto/action-position.dto';
import { QuickReply } from '@line/bot-sdk';
import { SwapPositionDto } from '../dto/swap-position.dto';
import { BuyPositionDto } from '../dto/buy-position.dto';


@Injectable()
export class GenerateMessageService {


  generateAlertSignalFlexMsg(data: TradingViewReqDto): FlexContainer {
    const coin = data.symbol.replace('USDT', '');
    const imageUrl = symbolImage[coin];
    return {
      'type': 'bubble',
      'body': {
        'type': 'box',
        'layout': 'vertical',
        'contents': [
          {
            'type': 'box',
            'layout': 'horizontal',
            'contents': [
              {
                'type': 'box',
                'layout': 'vertical',
                'contents': [
                  {
                    'type': 'image',
                    'url': imageUrl,
                    'aspectMode': 'cover',
                    'size': 'full',
                  },
                ],
                'cornerRadius': '100px',
                'width': '72px',
                'height': '72px',
              },
              {
                'type': 'box',
                'layout': 'vertical',
                'contents': [
                  {
                    'type': 'text',
                    'contents': [
                      {
                        'type': 'span',
                        'text': 'Symbol: ' + coin,
                        'weight': 'bold',
                        'color': '#000000',
                      },
                    ],
                    'size': 'sm',
                    'wrap': true,
                  },
                  {
                    'type': 'text',
                    'contents': [
                      {
                        'type': 'span',
                        'text': 'Side: ' + data.side,
                        'color': '#000000',
                      },
                    ],
                    'size': 'sm',
                    'wrap': true,
                  },
                  {
                    'type': 'text',
                    'contents': [
                      {
                        'type': 'span',
                        'text': 'Entry Price: ' + data.openPrice,
                        'color': '#000000',
                      },
                    ],
                    'size': 'sm',
                    'wrap': true,
                  },
                  {
                    'type': 'text',
                    'contents': [
                      {
                        'type': 'span',
                        'text': 'time: ' + dateToString(new Date()),
                        'color': '#000000',
                      },
                    ],
                    'size': 'sm',
                    'wrap': true,
                  },
                ],
              },
            ],
            'spacing': 'xl',
            'paddingAll': '20px',
          },
        ],
        'paddingAll': '0px',
      },
    } as FlexContainer;
  }

  generateCurrentOpeningPositionMessage(data: OpeningPositionDto): string {
    const header = `สถานการณ์ ณ เวลาปัจจุบัน: ${data.updateTime}`;
    let body = '';
    data.position.forEach(position => {
      body += `\n\nSymbol: ${position.symbol}\nSide: ${position.positionSide}`;
      body += `\nEntry Price: ${position.entryPrice}\nCurrent Price: ${position.markPrice}\nP/L(%): ${position.profitLossPercentage}%`;
      body += `\nDuration: ${position.duration}`;
    });
    return header + body;
  }

  generateSummaryTradingHistory(data: TradingHistoryDto[]): string {
    let body = 'ผลตอบแทนทั้งหมด';
    data.forEach(data => {
      body += `\n\nวันที่: ${data.sellDate}\nP/L(%): ${data.avg}%`;
      body += `\nเทรดทั้งหมด: ${data.total} ครั้ง\nชนะ: ${data.win} ครั้ง\nแพ้: ${data.loss} ครั้ง`;
    });
    return body;
  }

  generateFlexMsgCurrentPosition(req: OpeningPositionDto): FlexContainer {
    const { position, updateTime } = req;
    const average = position.reduce((total, next) => total + next.profitLossPercentage, 0) / position.length;
    const winPosition = position.filter(position => position.profitLossPercentage > 0);
    const colorAvg = average > 0 ? COLOR_GREEN : COLOR_RED;
    const todayDate = dateToString(new Date());
    const flex = {
      'type': 'carousel',
      'contents': [
        {
          'type': 'bubble',
          'size': 'mega',
          'body': {
            'type': 'box',
            'layout': 'vertical',
            'contents': [
              {
                'margin': 'md',
                'type': 'box',
                'layout': 'horizontal',
                'contents': [
                  {
                    'type': 'filler',
                  },
                  {
                    'type': 'text',
                    'text': 'Coin',
                    'color': '#111111',
                    'weight': 'bold',
                    'size': 'sm',
                    'align': 'center',
                  },
                  {
                    'type': 'text',
                    'text': 'Side',
                    'color': '#111111',
                    'weight': 'bold',
                    'size': 'sm',
                    'align': 'center',
                  },
                  {
                    'type': 'text',
                    'text': 'P/L(%)',
                    'color': '#111111',
                    'weight': 'bold',
                    'size': 'sm',
                    'align': 'center',
                  },
                ],
              },
              {
                'type': 'separator',
                'color': '#cccccc',
                'margin': 'md',
              },
            ],
          },
          'footer': {
            'type': 'box',
            'layout': 'vertical',
            'contents': [
              {
                'type': 'box',
                'layout': 'horizontal',
                'contents': [
                  {
                    'type': 'text',
                    'text': `W: ${winPosition.length}`,
                    'color': '#000000',
                    'size': 'xs',
                    'align': 'end',
                  },
                  {
                    'type': 'text',
                    'text': `L: ${position.length - winPosition.length}`,
                    'color': '#000000',
                    'size': 'xs',
                    'align': 'center',
                  },
                  {
                    'type': 'text',
                    'text': `AVG: ${average.toFixed(2)}%`,
                    'color': colorAvg,
                    'size': 'xs',
                    'align': 'start',
                  },
                ],
              },
              {
                'type': 'box',
                'layout': 'horizontal',
                'contents': [
                  {
                    'type': 'text',
                    'text': `Update Time : ${updateTime}`,
                    'color': '#999999',
                    'size': 'xs',
                    'align': 'end',
                    'flex': 1,
                  },
                ],
                'margin': 'sm',
              },
              {
                'type': 'box',
                'layout': 'horizontal',
                'paddingTop': '10px',
                'contents': [
                  {
                    'type': 'button',
                    'action': {
                      'type': 'postback',
                      'label': 'Close All Position',
                      'text': `#Close All Position`,
                      'data': `{"actionStatus":"${ActionPositionEnum.CLOSE_ALL_POSITION}","actionTime":"${todayDate}"}`,
                    },
                    'color': '#b14141',
                    'margin': 'none',
                    'height': 'sm',
                    'style': 'primary',
                    'gravity': 'center',
                  },
                ],
              },
            ],
          },
          'styles': {
            'body': {
              'backgroundColor': '#ffffff',
            },
            'footer': {
              'separator': true,
            },
          },
        },
      ],
    } as FlexContainer;
    const defaultImg = 'https://www.iconpacks.net/icons/2/free-cryptocurrency-coin-icon-2422-thumb.png';

    position.forEach(position => {
      const colorPercentage = position.profitLossPercentage > 0 ? COLOR_GREEN : COLOR_RED;
      const coin = position.symbol.replace('USDT', '');
      const imageUrl = symbolImage[coin] ? symbolImage[coin] : defaultImg;
      const side = position.positionSide.charAt(0);
      const colorSide = side == 'L' ? COLOR_GREEN : COLOR_RED;
      const flexContainer = {
        'margin': 'md',
        'type': 'box',
        'layout': 'horizontal',
        'contents': [
          {
            'type': 'image',
            'url': imageUrl,
            'aspectRatio': '120:48',
          },
          {
            'type': 'text',
            'text': coin,
            'color': '#000000',
            'weight': 'bold',
            'size': 'sm',
            'align': 'center',
            'gravity': 'center',
          },
          {
            'type': 'text',
            'text': side,
            'color': colorSide,
            'weight': 'bold',
            'size': 'sm',
            'align': 'center',
            'gravity': 'center',
          },
          {
            'type': 'text',
            'text': `${position.profitLossPercentage}%`,
            'color': colorPercentage,
            'weight': 'bold',
            'size': 'sm',
            'align': 'center',
            'gravity': 'center',
          },
        ],
      };
      flex['contents'][0]['body']['contents'].push(flexContainer);
    });

    return flex;
  }

  generateFlexMsgActionPosition(currentPosition: OpeningPositionDto): FlexContainer {
    console.log('call generateFlexMsgActionPosition');
    const carousel = {
      'type': 'carousel',
      'contents': [],
    } as FlexContainer;

    const updateTime = moment(currentPosition.updateTime).format('DD/MM HH:mm:ss');
    for (let i = 0; i < currentPosition.position.length; i++) {
      const position = currentPosition.position[i];
      const colorSide = position.positionSide == 'LONG' ? COLOR_GREEN : COLOR_RED;
      const colorPercentage = position.profitLossPercentage > 0 ? COLOR_GREEN : COLOR_RED;
      const coin = position.symbol.replace('USDT', '');
      const imageUrl = symbolImage[coin] ? symbolImage[coin] : symbolImage['DEFAULT'];
      const todayDate = dateToString(new Date());
      const flexBubble = {
        'type': 'bubble',
        'size': 'kilo',
        'body': {
          'type': 'box',
          'layout': 'vertical',
          'contents': [
            {
              'type': 'box',
              'layout': 'vertical',
              'contents': [
                {
                  'type': 'box',
                  'layout': 'horizontal',
                  'paddingAll': '10px',
                  'contents': [
                    {
                      'type': 'box',
                      'layout': 'horizontal',
                      'margin': 'sm',
                      'contents': [
                        {
                          'type': 'image',
                          'url': imageUrl,
                          'align': 'start',
                          'gravity': 'top',
                          'size': 'xxs',
                          'aspectMode': 'cover',
                        },
                        {
                          'type': 'text',
                          'text': position.symbol,
                          'weight': 'bold',
                          'color': '#000000FF',
                          'flex': 5,
                          'align': 'start',
                          'gravity': 'top',
                          'margin': 'xs',
                        },
                      ],
                    },
                    {
                      'type': 'box',
                      'layout': 'horizontal',
                      'contents': [
                        {
                          'type': 'text',
                          'text': `P/L: ${position.profitLossPercentage}%`,
                          'weight': 'bold',
                          'color': colorPercentage,
                          'flex': 1,
                          'align': 'end',
                          'gravity': 'center',
                        },
                      ],
                    },
                  ],
                },
                {
                  'type': 'separator',
                  'margin': 'sm',
                  'color': '#A39595FF',
                },
                {
                  'type': 'box',
                  'layout': 'vertical',
                  'paddingAll': '10px',
                  'contents': [
                    {
                      'type': 'box',
                      'layout': 'horizontal',
                      'contents': [
                        {
                          'type': 'text',
                          'text': 'Entry Price:',
                          'weight': 'bold',
                          'size': 'sm',
                          'align': 'start',
                          'gravity': 'center',
                        },
                        {
                          'type': 'text',
                          'text': `${position.entryPrice}`,
                          'size': 'sm',
                          'align': 'end',
                          'gravity': 'center',
                        },
                      ],
                    },
                    {
                      'type': 'box',
                      'layout': 'horizontal',
                      'contents': [
                        {
                          'type': 'text',
                          'text': 'Mark Price:',
                          'weight': 'bold',
                          'size': 'sm',
                          'align': 'start',
                          'gravity': 'center',
                        },
                        {
                          'type': 'text',
                          'text': `${position.markPrice}`,
                          'size': 'sm',
                          'align': 'end',
                          'gravity': 'center',
                        },
                      ],
                    },
                    {
                      'type': 'box',
                      'layout': 'horizontal',
                      'contents': [
                        {
                          'type': 'text',
                          'text': 'Side:',
                          'weight': 'bold',
                          'size': 'sm',
                          'align': 'start',
                          'gravity': 'center',
                        },
                        {
                          'type': 'text',
                          'text': `${position.positionSide}`,
                          'size': 'sm',
                          'color': colorSide,
                          'align': 'end',
                          'gravity': 'center',
                        },
                      ],
                    },
                    {
                      'type': 'box',
                      'layout': 'horizontal',
                      'contents': [
                        {
                          'type': 'text',
                          'text': 'Quantity:',
                          'weight': 'bold',
                          'size': 'sm',
                          'align': 'start',
                          'gravity': 'center',
                        },
                        {
                          'type': 'text',
                          'text': `${position.quantity}`,
                          'size': 'sm',
                          'align': 'end',
                          'gravity': 'center',
                        },
                      ],
                    },
                    {
                      'type': 'box',
                      'layout': 'horizontal',
                      'contents': [
                        {
                          'type': 'text',
                          'text': 'P/L(USDT):',
                          'weight': 'bold',
                          'size': 'sm',
                          'align': 'start',
                          'gravity': 'center',
                        },
                        {
                          'type': 'text',
                          'text': `${position.profitLoss} USDT`,
                          'size': 'sm',
                          'align': 'end',
                          'color': colorPercentage,
                          'gravity': 'center',
                        },
                      ],
                    },
                    {
                      'type': 'box',
                      'layout': 'horizontal',
                      'contents': [
                        {
                          'type': 'text',
                          'text': 'P/L(%):',
                          'weight': 'bold',
                          'size': 'sm',
                          'align': 'start',
                          'gravity': 'center',
                        },
                        {
                          'type': 'text',
                          'text': `${position.profitLossPercentage}%`,
                          'size': 'sm',
                          'align': 'end',
                          'color': colorPercentage,
                          'gravity': 'center',
                        },
                      ],
                    },
                    {
                      'type': 'box',
                      'layout': 'horizontal',
                      'contents': [
                        {
                          'type': 'text',
                          'text': 'Duration:',
                          'weight': 'bold',
                          'size': 'sm',
                          'align': 'start',
                          'gravity': 'center',
                        },
                        {
                          'type': 'text',
                          'text': `${position.duration}`,
                          'size': 'sm',
                          'align': 'end',
                          'gravity': 'center',
                        },
                      ],
                    },
                    {
                      'type': 'box',
                      'layout': 'horizontal',
                      'contents': [
                        {
                          'type': 'text',
                          'text': 'Update Time:',
                          'weight': 'bold',
                          'size': 'sm',
                          'align': 'start',
                          'gravity': 'center',
                        },
                        {
                          'type': 'text',
                          'text': `${updateTime}`,
                          'size': 'sm',
                          'align': 'end',
                          'gravity': 'center',
                        },
                      ],
                    },
                  ],
                },
                {
                  'type': 'separator',
                  'margin': 'sm',
                  'color': '#A39595FF',
                },
                {
                  'type': 'box',
                  'layout': 'horizontal',
                  'paddingTop': '15px',
                  'contents': [
                    {
                      'type': 'button',
                      'action': {
                        'type': 'postback',
                        'label': 'Take P/F',
                        'text': `#Take Profit ${position.symbol}`,
                        'data': `{"actionStatus":"${ActionPositionEnum.TAKE_PROFIT}","transactionId":${position.transactionId},"markPrice":${position.markPrice},"symbol":"${position.symbol}","actionTime":"${todayDate}"}`,
                      },
                      'height': 'sm',
                      'style': 'primary',
                      'gravity': 'center',
                    },
                    {
                      'type': 'separator',
                      'margin': 'lg',
                      'color': '#FFFFFF00',
                    },
                    {
                      'type': 'button',
                      'action': {
                        'type': 'postback',
                        'label': 'Swap Pos',
                        'text': `#Swap Position ${position.symbol}`,
                        'data': `{"actionStatus":"${ActionPositionEnum.SWAP_POSITION}","transactionId":${position.transactionId},"markPrice":${position.markPrice},"symbol":"${position.symbol}","actionTime":"${todayDate}"}`,
                      },
                      'color': '#f2af2b',
                      'margin': 'none',
                      'height': 'sm',
                      'style': 'primary',
                      'gravity': 'center',
                    },
                  ],
                },
                {
                  'type': 'box',
                  'layout': 'horizontal',
                  'paddingTop': '10px',
                  'contents': [
                    {
                      'type': 'button',
                      'action': {
                        'type': 'postback',
                        'label': 'Close Position',
                        'text': `#Close Position ${position.symbol}`,
                        'data': `{"actionStatus":"${ActionPositionEnum.CLOSE_POSITION}","transactionId":${position.transactionId},"markPrice":${position.markPrice},"symbol":"${position.symbol}","actionTime":"${todayDate}"}`,
                      },
                      'color': '#9E0000FF',
                      'margin': 'none',
                      'height': 'sm',
                      'style': 'primary',
                      'gravity': 'center',
                    },
                  ],
                },
              ],
            },
          ],
        },
        'styles': {
          'body': {
            'backgroundColor': '#FAFAFAFF',
          },
        },
      } as FlexBubble;
      if (carousel.type !== 'bubble') {
        carousel.contents.push(flexBubble);
      }
    }
    return carousel;
  }

  generateFlexMsgTakeProfit(closedPosition: ClosedPositionDto): FlexContainer {
    const resultStatusMapping = { 'W': 'WIN', 'L': 'LOSS' };
    const closedTime = moment(closedPosition.closedTime).format('DD/MM HH:mm:ss');
    const colorSide = closedPosition.positionSide == 'LONG' ? COLOR_GREEN : COLOR_RED;
    const colorPercentage = closedPosition.plPercentage > 0 ? COLOR_GREEN : COLOR_RED;
    const coin = closedPosition.symbol.replace('USDT', '');
    const imageUrl = symbolImage[coin] ? symbolImage[coin] : symbolImage['DEFAULT'];
    return {
      'type': 'bubble',
      'size': 'kilo',
      'body': {
        'type': 'box',
        'layout': 'vertical',
        'contents': [
          {
            'type': 'box',
            'layout': 'vertical',
            'contents': [
              {
                'type': 'box',
                'layout': 'horizontal',
                'paddingAll': '10px',
                'contents': [
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'margin': 'sm',
                    'contents': [
                      {
                        'type': 'image',
                        'url': imageUrl,
                        'align': 'start',
                        'gravity': 'top',
                        'size': 'xxs',
                        'aspectMode': 'cover',
                      },
                      {
                        'type': 'text',
                        'text': closedPosition.symbol,
                        'weight': 'bold',
                        'color': '#000000FF',
                        'flex': 5,
                        'align': 'start',
                        'gravity': 'top',
                        'margin': 'xs',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': `TAKE P/F`,
                        'weight': 'bold',
                        'color': '#47b557',
                        'flex': 1,
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                ],
              },
              {
                'type': 'separator',
                'margin': 'sm',
                'color': '#A39595FF',
              },
              {
                'type': 'box',
                'layout': 'vertical',
                'paddingAll': '10px',
                'contents': [
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Entry Price:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${closedPosition.buyPrice}`,
                        'size': 'sm',
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'TP Price:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${closedPosition.closedPrice}`,
                        'size': 'sm',
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Status:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `TAKE P/F`,
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Side:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${closedPosition.positionSide}`,
                        'size': 'sm',
                        'color': colorSide,
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Quantity:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${closedPosition.quantity}`,
                        'size': 'sm',
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'P/L(USDT):',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${closedPosition.pl} USDT`,
                        'size': 'sm',
                        'align': 'end',
                        'color': colorPercentage,
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'P/L(%):',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${closedPosition.plPercentage}%`,
                        'size': 'sm',
                        'align': 'end',
                        'color': colorPercentage,
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Result:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${resultStatusMapping[closedPosition.resultStatus]}`,
                        'size': 'sm',
                        'align': 'end',
                        'color': colorPercentage,
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Duration:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${closedPosition.duration}`,
                        'size': 'sm',
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Closed Time:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${closedTime}`,
                        'size': 'sm',
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      'styles': {
        'body': {
          'backgroundColor': '#FAFAFAFF',
        },
      },
    } as FlexContainer;
  }

  generateFlexMsgClosedPosition(closedPosition: ClosedPositionDto): FlexContainer {
    const resultStatusMapping = { 'W': 'WIN', 'L': 'LOSS' };
    const closedTime = moment(closedPosition.closedTime).format('DD/MM HH:mm:ss');
    const colorSide = closedPosition.positionSide == 'LONG' ? COLOR_GREEN : COLOR_RED;
    const colorPercentage = closedPosition.plPercentage > 0 ? COLOR_GREEN : COLOR_RED;
    const coin = closedPosition.symbol.replace('USDT', '');
    const imageUrl = symbolImage[coin] ? symbolImage[coin] : symbolImage['DEFAULT'];
    return {
      'type': 'bubble',
      'size': 'kilo',
      'body': {
        'type': 'box',
        'layout': 'vertical',
        'contents': [
          {
            'type': 'box',
            'layout': 'vertical',
            'contents': [
              {
                'type': 'box',
                'layout': 'horizontal',
                'paddingAll': '10px',
                'contents': [
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'margin': 'sm',
                    'contents': [
                      {
                        'type': 'image',
                        'url': imageUrl,
                        'align': 'start',
                        'gravity': 'top',
                        'size': 'xxs',
                        'aspectMode': 'cover',
                      },
                      {
                        'type': 'text',
                        'text': closedPosition.symbol,
                        'weight': 'bold',
                        'color': '#000000FF',
                        'flex': 5,
                        'align': 'start',
                        'gravity': 'top',
                        'margin': 'xs',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': `CLOSED`,
                        'weight': 'bold',
                        'color': '#9E0000FF',
                        'flex': 1,
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                ],
              },
              {
                'type': 'separator',
                'margin': 'sm',
                'color': '#A39595FF',
              },
              {
                'type': 'box',
                'layout': 'vertical',
                'paddingAll': '10px',
                'contents': [
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Entry Price:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${closedPosition.buyPrice}`,
                        'size': 'sm',
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Closed Price:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${closedPosition.closedPrice}`,
                        'size': 'sm',
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Status:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `CLOSED`,
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Side:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${closedPosition.positionSide}`,
                        'size': 'sm',
                        'color': colorSide,
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Quantity:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${closedPosition.quantity}`,
                        'size': 'sm',
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'P/L(USDT):',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${closedPosition.pl} USDT`,
                        'size': 'sm',
                        'align': 'end',
                        'color': colorPercentage,
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'P/L(%):',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${closedPosition.plPercentage}%`,
                        'size': 'sm',
                        'align': 'end',
                        'color': colorPercentage,
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Result:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${resultStatusMapping[closedPosition.resultStatus]}`,
                        'size': 'sm',
                        'align': 'end',
                        'color': colorPercentage,
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Duration:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${closedPosition.duration}`,
                        'size': 'sm',
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Closed Time:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${closedTime}`,
                        'size': 'sm',
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      'styles': {
        'body': {
          'backgroundColor': '#FAFAFAFF',
        },
      },
    } as FlexContainer;
  }

  generateFlexMsgBuyPosition(buyPosition: BuyPositionDto): FlexContainer {
    console.log('call function generateFlexMsgBuyPosition');
    const buyTime = moment(buyPosition.buyDate).format('DD/MM HH:mm:ss');
    const colorSide = buyPosition.positionSide == 'LONG' ? COLOR_GREEN : COLOR_RED;
    const coin = buyPosition.symbol.replace('USDT', '');
    const imageUrl = symbolImage[coin] ? symbolImage[coin] : symbolImage['DEFAULT'];
    return {
      'type': 'bubble',
      'size': 'kilo',
      'body': {
        'type': 'box',
        'layout': 'vertical',
        'contents': [
          {
            'type': 'box',
            'layout': 'vertical',
            'contents': [
              {
                'type': 'box',
                'layout': 'horizontal',
                'paddingAll': '10px',
                'contents': [
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'margin': 'sm',
                    'contents': [
                      {
                        'type': 'image',
                        'url': imageUrl,
                        'align': 'start',
                        'gravity': 'top',
                        'size': 'xxs',
                        'aspectMode': 'cover',
                      },
                      {
                        'type': 'text',
                        'text': buyPosition.symbol,
                        'weight': 'bold',
                        'color': '#000000FF',
                        'flex': 5,
                        'align': 'start',
                        'gravity': 'top',
                        'margin': 'xs',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': `OPENED`,
                        'weight': 'bold',
                        'color': '#47b557',
                        'flex': 1,
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                ],
              },
              {
                'type': 'separator',
                'margin': 'sm',
                'color': '#A39595FF',
              },
              {
                'type': 'box',
                'layout': 'vertical',
                'paddingAll': '10px',
                'contents': [
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Entry Price:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${buyPosition.buyPrice}`,
                        'size': 'sm',
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Status:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `OPENED`,
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Side:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${buyPosition.positionSide}`,
                        'size': 'sm',
                        'color': colorSide,
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Quantity:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${buyPosition.quantity}`,
                        'size': 'sm',
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Cost:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${buyPosition.buyCost}`,
                        'size': 'sm',
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                  {
                    'type': 'box',
                    'layout': 'horizontal',
                    'contents': [
                      {
                        'type': 'text',
                        'text': 'Updated Time:',
                        'weight': 'bold',
                        'size': 'sm',
                        'align': 'start',
                        'gravity': 'center',
                      },
                      {
                        'type': 'text',
                        'text': `${buyTime}`,
                        'size': 'sm',
                        'align': 'end',
                        'gravity': 'center',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      'styles': {
        'body': {
          'backgroundColor': '#FAFAFAFF',
        },
      },
    } as FlexContainer;
  }

  generateMsgAskToConfirm(req: ActionPositionDto): string {
    const { symbol, actionStatus } = req;
    const actionMapping = { 'cp': 'Close Position', 'tp': 'Take Profit', 'sp': 'Swap Position' };
    return `ต้องการจะ ${actionMapping[actionStatus]} เหรียญ ${symbol} ใช่หรือไม่?`;
  }

  generateMsgAskToConfirmCloseAllPosition(): string {
    let replyString = '';
    replyString += '** คำเตือน ** \n';
    replyString += 'หากกด ยืนยัน จะทำการปิด position ที่เปิดอยู่ทั้งหมด\n';
    replyString += 'คุณต้องการที่จะปิด position ทั้งหมดหรือไม่?';
    return replyString;
  }

  generateQuickReplyAskConfirmClosePosition(req: ActionPositionDto): QuickReply {
    const { actionStatus, transactionId, symbol, markPrice } = req;
    const todayDate = dateToString(new Date());
    return {
      'items': [
        {
          'type': 'action',
          'action': {
            'type': 'postback',
            'label': 'ยืนยัน',
            'data': `{"actionStatus":"${actionStatus}","isConfirmed":${true},"actionTime":"${todayDate}"}`,
            'displayText': 'ยืนยันปิด position ทั้งหมด',
          },
        },
        {
          'type': 'action',
          'action': {
            'type': 'postback',
            'label': 'ไม่ยืนยัน ปิด position',
            'data': `{"actionStatus":"${actionStatus}","isConfirmed":${false},"actionTime":"${todayDate}"}`,
            'displayText': 'ไม่ยืนยัน ปิด position',
          },
        },
      ],
    } as QuickReply;
  }

  generateQuickReplyAskConfirmTransaction(req: ActionPositionDto): QuickReply {
    const { actionStatus, transactionId, symbol, markPrice } = req;
    const todayDate = dateToString(new Date());
    return {
      'items': [
        {
          'type': 'action',
          'action': {
            'type': 'postback',
            'label': 'ใช่',
            'data': `{"actionStatus":"${actionStatus}","transactionId":${transactionId},"markPrice":${markPrice},"symbol":"${symbol}","isConfirmed":${true},"actionTime":"${todayDate}"}`,
            'displayText': 'ใช่',
          },
        },
        {
          'type': 'action',
          'action': {
            'type': 'postback',
            'label': 'ไม่ใช่',
            'data': `{"actionStatus":"${actionStatus}","transactionId":${transactionId},"markPrice":${markPrice},"symbol":"${symbol}","isConfirmed":${false},"actionTime":"${todayDate}"}`,
            'displayText': 'ไม่ใช่',
          },
        },
      ],
    } as QuickReply;
  }

  generateQuickReplyRegisterLineUser(lineUserId: string): QuickReply {
    return {
      'items': [
        {
          'type': 'action',
          'action': {
            'type': 'postback',
            'label': 'ลงทะเบียน',
            'data': `{"lineUserId":"${lineUserId}"}`,
            'displayText': 'ลงทะเบียน',
          },
        },
      ],
    } as QuickReply;
  }

  generateQuickReplyRegisterURL(lineId: string): QuickReply {
    return {
      'items': [
        {
          'type': 'action',
          'action': {
            'type': 'uri',
            'label': 'Google',
            'uri': `https://52b4-49-228-150-211.ngrok.io?id=${lineId}`,
          },
        },
      ],
    } as QuickReply;
  }

}
