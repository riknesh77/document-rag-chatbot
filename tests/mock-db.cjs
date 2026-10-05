function createMockDb({ failInsert = false } = {}) {
  const state = { documents: [], statements: [], committed: 0, rolledBack: 0 };
  return {
    state,
    async $transaction(callback) {
      const staged = { documents: [], statements: [] };
      const tx = {
        document: { create: async ({data}) => {
          const row = {id: state.documents.length + 1, ...data};
          staged.documents.push(row);
          return row;
        }},
        $executeRaw: async sql => {
          if (failInsert) throw new Error('postgresql://secret:password@private');
          staged.statements.push(sql);
          return 1;
        },
      };
      try {
        const result = await callback(tx);
        state.documents.push(...staged.documents);
        state.statements.push(...staged.statements);
        state.committed++;
        return result;
      } catch (error) {state.rolledBack++;throw error;}
    },
  };
}
module.exports = { createMockDb };
