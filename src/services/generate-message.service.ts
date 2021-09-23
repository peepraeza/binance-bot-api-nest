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

    const flex = {
      'type': 'carousel',
      'contents': [
        {
          'type': 'bubble',
          'size': 'mega',
          'header': {
            'type': 'box',
            'layout': 'horizontal',
            'backgroundColor': '#00bce4',
            'contents': [
              {
                'type': 'text',
                'text': 'Current Position',
                'weight': 'bold',
                'size': 'lg',
                'gravity': 'center',
                'align': 'center',
                'color': '#FFFFFF',
              },
            ],
          },
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
            ],
          },
          'styles': {
            'header': {
              'backgroundColor': '#6486E3',
            },
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

  async generateFlexMsgTakePFAndClosePS(currentPosition: OpeningPositionDto): Promise<FlexContainer> {
    const carousel = {
      'type': 'carousel',
      'contents': [],
    } as FlexContainer;

    const updateTime = moment(currentPosition.updateTime).format('DD/MM HH:mm:ss');
    for (let i = 0; i < 12; i++) {
      const position = currentPosition.position[i];
      const colorSide = position.positionSide == 'LONG' ? COLOR_GREEN : COLOR_RED;
      const colorPercentage = position.profitLossPercentage > 0 ? COLOR_GREEN : COLOR_RED;
      const coin = position.symbol.replace('USDT', '');
      const imageUrl = symbolImage[coin] ? symbolImage[coin] : symbolImage['DEFAULT'];
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
                          'text': 'P/L(USDT):',
                          'weight': 'bold',
                          'size': 'sm',
                          'align': 'start',
                          'gravity': 'center',
                        },
                        {
                          'type': 'text',
                          'text': '0',
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
                        'text': `กำลังปิด Take Profit ${position.symbol}`,
                        'data': `{"actionStatus":"${ActionPositionEnum.TAKE_PROFIT}","transactionId":"${position.transactionId}","markPrice":"${position.markPrice}"}`,
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
                        'label': 'Close Pos',
                        'text': `กำลังปิด Position ${position.symbol}`,
                        'data': `{"actionStatus":"${ActionPositionEnum.CLOSE_POSITION}","transactionId":"${position.transactionId}","markPrice":"${position.markPrice}"}`,
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

  generateClosedPositionMsg(req: ClosedPositionDto): string {
    const { symbol, closedPrice, closedTime, resultStatus, pl, plPercentage, duration, positionSide } = req;
    let body = `ปิด Position ${positionSide} เหรียญ ${symbol} แล้ว`;
    body += `\nราคา: ${closedPrice} ณ วันที่: ${closedTime}`;
    body += `\nP/L(USDT): ${pl}\nP/L(%): ${plPercentage}%`;
    body += `\nผลลัพธ์: ${resultStatus}\nใช้เวลาเทรด: ${duration}`;
    return body;
  }
}
