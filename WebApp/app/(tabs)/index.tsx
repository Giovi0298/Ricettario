import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, TextInput, Button, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSocket } from '@/hooks/useSocket';

export default function HomeScreen() {
  const { socket, isConnected } = useSocket();
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [newIngredient, setNewIngredient] = useState('');

  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('get_ingredients');

      socket.on('ingredients_list', (data: any[]) => {
        setIngredients(data);
      });

      socket.on('ingredient_added', (data: any) => {
        console.log('Ingredient added:', data);
      });

      return () => {
        socket.off('ingredients_list');
        socket.off('ingredient_added');
      };
    }
  }, [socket, isConnected]);

  const addIngredient = () => {
    if (socket && newIngredient.trim()) {
      socket.emit('add_ingredient', { Nome: newIngredient });
      setNewIngredient('');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Ricettario</ThemedText>
        <ThemedText style={{ color: isConnected ? 'green' : 'red' }}>
          {isConnected ? 'Connesso' : 'Disconnesso'}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Ingredienti</ThemedText>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nuovo ingrediente..."
            value={newIngredient}
            onChangeText={setNewIngredient}
            placeholderTextColor="#888"
          />
          <Button title="Aggiungi" onPress={addIngredient} />
        </View>
        <FlatList
          data={ingredients}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ThemedView style={styles.item}>
              <ThemedText>{item.Nome}</ThemedText>
            </ThemedView>
          )}
          style={styles.list}
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  section: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    marginTop: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginRight: 10,
    borderRadius: 5,
    color: '#fff',
  },
  list: {
    marginTop: 10,
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
