import { Injectable } from '@nestjs/common';
import { FlexContainer } from '@line/bot-sdk/lib/types';
import { TradingViewReqDto } from '../dto/webhook/trading-view.req.dto';
import * as symbolImage from '../constant-json/symbol-image.json';
import { dateToString } from '../utils/utils';
import { OpeningPositionDto } from '../dto/opening-position.dto';
import { COLOR_GREEN, COLOR_RED } from '../constants/constants';


@Injectable()
export class GenerateMessageService {


  generateFlexMessage(data: TradingViewReqDto): FlexContainer {
    const coin = data.symbol.replace('USDT', '');
    const imageUrl = symbolImage[coin];
    const msg = {
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

    return msg;
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
}
