import { IsBoolean } from 'class-validator';
export class ReviewFlashcardDto { @IsBoolean() known: boolean }
