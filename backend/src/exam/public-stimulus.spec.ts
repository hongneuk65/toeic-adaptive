import { publicStimulus } from './public-stimulus';

describe('Exam stimulus public contract', () => {
  const stimulus = {version: 1, groupId: 'group', questionPosition: 1, audioDurationSeconds: 10,
    correctAnswer: 'B', explanation: 'secret', documents: [{id: 'one', answers: ['B'], blocks: [
      {type: 'paragraph', correctAnswer: 'B', children: [{type: 'text', text: 'Passage', explanation: 'secret'}]},
      {type: 'image', url: '/image.png', alt: 'spoken answer transcript', answer: 'B'},
    ]}]};
  it('drops grading metadata recursively while preserving supported rendered content', () => {
    const json = JSON.stringify(publicStimulus(stimulus));
    expect(json).not.toContain('correctAnswer');
    expect(json).not.toContain('explanation');
    expect(json).not.toContain('answers');
    expect(json).toContain('Passage');
    expect(json).toContain('audioDurationSeconds');
  });
  it('does not copy objects into scalar rendering fields', () => {
    const secret = {correctAnswer: 'B'};
    const result = publicStimulus({groupId: secret, questionPosition: secret, documents: [{id: secret, blocks: [{type: 'image', url: secret}, {type: 'blank', number: secret}, {type: 'cell', colSpan: secret}]}]});
    expect(JSON.stringify(result)).not.toContain('correctAnswer');
  });
  it('hides spoken transcripts including image alt text for listening photo and response tasks', () => {
    const json = JSON.stringify(publicStimulus(stimulus, true));
    expect(json).not.toContain('Passage');
    expect(json).not.toContain('spoken answer');
    expect(json).toContain('/image.png');
  });
});
