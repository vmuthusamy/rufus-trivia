// Opt-in registration for this local experiment. Production's topic list stays untouched.
import {TOPICS,TOPIC_BY_ID} from '../../src/shared/topics/index.js';
import {STICKERS,STICKER_BY_ID} from '../../src/shared/stickers.js';
import {geographyTopics} from './geography.js';
for(const topic of geographyTopics){if(!TOPIC_BY_ID[topic.id]){TOPICS.push(topic);TOPIC_BY_ID[topic.id]=topic;const sticker={id:topic.id+'_master',emoji:topic.emoji,name:topic.title+' Master',how:'Get 15 right in one '+topic.title+' game',rarity:3};STICKERS.push(sticker);STICKER_BY_ID[sticker.id]=sticker;}}
