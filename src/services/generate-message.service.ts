import { Injectable } from '@nestjs/common';
import { FlexContainer } from '@line/bot-sdk/lib/types';
import { TradingViewReqDto } from '../dto/webhook/trading-view.req.dto';
import * as symbolImage from '../constant-json/symbol-image.json';
import { dateToString } from '../utils/utils';
import { OpeningPositionDto } from '../dto/opening-position.dto';

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
}
